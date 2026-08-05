import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, it, expect } from 'vitest';

import { compile, mdxish, mix, renderMdxish, run } from '../../../lib';
import { findElementByTagName } from '../../helpers';

// Run the full mdxish → renderMdxish → React render pipeline and return the HTML.
// Needed (instead of `mix`) so caller-provided / in-document components actually execute.
const renderToHtml = (md: string, opts: Parameters<typeof mdxish>[1] = {}): string => {
  const ast = mdxish(md, opts);
  const { default: Content } = renderMdxish(ast);
  return Content ? renderToStaticMarkup(React.createElement(Content)) : '';
};

describe('In-document MDX variable and function declarations', () => {
  it('throws on malformed export bodies', () => {
    // `export const x =;` is syntactically invalid
    const md = 'export const x =;\n\nHello world.';
    expect(() => mdxish(md)).toThrow(/unexpected|parse|syntax/i);
  });

  it('removes export declarations from the rendered output', () => {
    const md = 'export const foo = "hello";\n\nBody text.';
    const html = mix(md);

    expect(html).not.toContain('export const');
  });


  describe('when exports are not supposed to be evaluated', () => {
    it('does not evaluate exports when safeMode is enabled and keeps them as literal text', () => {
      const md = 'export const foo = "hello";\n\nValue: {foo}.';
      const html = mix(md, { safeMode: true });
      expect(html).toContain('export const foo = "hello";');
      expect(html).toContain('Value: {foo}.');
    });

    it('does not treat prose starting with "Export"/"Import" as ESM exports', () => {
      const md = 'Export your data by clicking save.\n\nImport the file first.';
      const html = mix(md);
      expect(html).toContain('Export your data');
      expect(html).toContain('Import the file');
    });
  });

  describe('variable declarations', () => {
    it('resolves `export const` values inside `{...}` expressions', () => {
      const md = 'export const foo = "hello";\n\nHi {foo}.';
      const html = mix(md);

      expect(html).toContain('Hi hello.');
    });

    it('resolves multiple variable declarations in the same line', () => {
      const md = 'export const a = 1, b = 2, c = 3;\n\nNumbers: {a} {b} {c}';
      const html = mix(md);
      expect(html).toContain('Numbers: 1 2 3');
    });

    it('resolves mixed types of variable declarations in the same line', () => {
      const md = 'export const a = 1, b = "hello", c = true;\n\nNumbers: {a} Strings: {b} Booleans: {c}';
      const html = mix(md);
      expect(html).toContain('Numbers: 1 Strings: hello Booleans: true');
    });

    it('resolves HTML values', () => {
      const md = 'export const variable = <strong>hello</strong>;\n\n{variable}';
      const html = mix(md);
      expect(html).toContain('<strong>hello</strong>');
    });

    it('is aware of previous exports', () => {
      const md = `export const a = 5;
export const b = a + 10;
export const c = b * 2;

Total: {c}.`;
      const html = mix(md);
      expect(html).toContain('Total: 30.');
    });

    it('resolves forwardly declared exports', () => {
      const md = `export const a = Foo();
export function Foo() {
  return <strong>hello</strong>;
}

a = {a}`;
      const html = mix(md);
      expect(html).toContain('a = <strong>hello</strong>');
    });

    it('binds names from object destructuring', () => {
      const md = 'export const { a, b } = { a: 1, b: 2 };\n\na = {a}, b = {b}';
      expect(mix(md)).toContain('a = 1, b = 2');
    });

    it('binds names from array destructuring', () => {
      const md = 'export const [first, second] = [10, 20];\n\nFirst: {first}, Second: {second}';
      expect(mix(md)).toContain('First: 10, Second: 20');
    });

    it('supports `export let` the same as `export const`', () => {
      const md = 'export let counter = 7;\n\nCount: {counter}.';
      expect(mix(md)).toContain('Count: 7.');
    });
  });

  describe('function declarations', () => {
    it('makes `export function` declarations available as JSX components', () => {
      const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
      const ast = mdxish(md);

      const el = findElementByTagName(ast,'Greeting');
      expect(el).toBeDefined();
    });

    it('renders `export function` components to their JSX body', () => {
      const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
      const html = renderToHtml(md);
      expect(html).toContain('Hey Ho');
      expect(html).toContain('<div>Hey Ho</div>');
    });

    it('renders component when called using <Component /> syntax', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n<Greeting />.';
      expect(renderToHtml(md)).toContain('hello');
    });

    it('renders component when called using Component() syntax', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n{Greeting()}.';
      expect(renderToHtml(md)).toContain('<div>hello</div>');
    });

    it('detects & renders components defined with arrow functions', () => {
      const md = `export const Arrow = () => <span>This is an arrow function component</span>;

1. Tag: <Arrow />

2. Expression: {<Arrow />}
      `;
      const html = renderToHtml(md);
      expect(html).toContain('Tag: <span>This is an arrow function component</span>');
      expect(html).toContain('Expression: <span>This is an arrow function component</span>');
    });

    it('aware of previous exports', () => {
      const md = `export function shout(s) { return s.toUpperCase(); }
export function wrap(s) { return "SHOUTED: " + shout(s); }

{wrap("hello")}.`;
      expect(renderToHtml(md)).toContain('SHOUTED: HELLO');
    });

    it('detects a component whose body returns JSX indirectly through a call', () => {
      const md = `export const make = () => <strong>made</strong>;
export const Maker = () => make();

<Maker />`;
      expect(renderToHtml(md)).toContain('<strong>made</strong>');
    });

    it('evaluates an `export default` function declaration', () => {
      const md = `export default function Defaulted() {
  return <div>default</div>;
}

<Defaulted />`;
      expect(renderToHtml(md)).toContain('<div>default</div>');
    });

    it('supports mutually recursive function declarations', () => {
      const md = `export function isEven(n) { return n === 0 ? true : isOdd(n - 1); }
export function isOdd(n) { return n === 0 ? false : isEven(n - 1); }

isEven(4) = {isEven(4)}.`;
      expect(mix(md)).toContain('isEven(4) = true.');
    });

    // There were cases where blank lines inside a declaration body
    // might cause errors because the brace-balancing preprocessor
    // escaped them
    describe('blank lines inside declaration bodies', () => {
      it('renders an arrow component with a blank line in its body', () => {
        const md = `export const Foo = () => {
  const x = "hello world";

  return <div>{x}</div>;
};

<Foo />`;
        expect(() => mdxish(md)).not.toThrow();
        expect(renderToHtml(md)).toContain('<div>hello world</div>');
      });

      it('renders an `export function` component with a blank line in its body', () => {
        const md = `export function Greeting() {

  return <div>Hey Ho</div>;
}

<Greeting />`;
        expect(renderToHtml(md)).toContain('<div>Hey Ho</div>');
      });

      it('tolerates multiple consecutive blank lines in a body', () => {
        const md = `export const Foo = () => {
  const x = "spread out";



  return <div>{x}</div>;
};

<Foo />`;
        expect(renderToHtml(md)).toContain('<div>spread out</div>');
      });

      it('resolves an exported object value declared across a blank line', () => {
        const md = `export const config = {
  greeting: "hi",

  name: "world",
};

{config.greeting} {config.name}`;
        expect(mix(md)).toContain('hi world');
      });

      it('renders a blank-line component nested inside a Callout', () => {
        const md = `export const Inner = () => {
  const label = "nested";

  return <strong>{label}</strong>;
};

> 👍 Heads up
>
> <Inner />`;
        expect(renderToHtml(md)).toContain('<strong>nested</strong>');
      });
      
      it('renders an `export default function` whose JSX ternary spans block elements', () => {
        const md = `export default function Page() {
  const selected = "";

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flexGrow: 1 }}>
        {selected === '' ? (
          <div>
            <p>
              Empty state.<br />
              Pick something.
            </p>
          </div>
        ) : (
          <p>Has a selection.</p>
        )}
      </div>
    </div>
  );
}

<Page />`;
        expect(() => mdxish(md)).not.toThrow();
        expect(renderToHtml(md, { newEditorTypes: true })).toBe(
          '<div style="display:flex"><div style="flex-grow:1"><div><p>Empty state.<br/>Pick something.</p></div></div></div>',
        );
      });

      it('handles the same brace-spanning ternary in an `export const` arrow component', () => {
        const md = `export const Panel = () => {
  const active = true;

  return (
    <div>
      {active ? (
        <span>on</span>
      ) : (
        <span>off</span>
      )}
    </div>
  );
};

<Panel />`;
        expect(() => mdxish(md)).not.toThrow();
        expect(renderToHtml(md, { newEditorTypes: true })).toBe('<div><span>on</span></div>');
      });

      it('handles a brace-spanning ternary condensed onto one JSX return line', () => {
        const md = `export default function Compact() {
  const show = false;
  return (<div>{show ? (<b>yes</b>) : (<i>no</i>)}</div>);
}

<Compact />`;
        expect(() => mdxish(md)).not.toThrow();
        expect(renderToHtml(md, { newEditorTypes: true })).toBe('<div><i>no</i></div>');
      });
    });
  });

  describe('library imports', () => {
    it('resolves a named React import used inside an exported component (RM-16919)', () => {
      const md = `import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Add</button>
      <p>{count}</p>
    </div>
  );
};

<Counter />`;
      const html = renderToHtml(md);
      expect(html).toContain('<button>Add</button>');
      expect(html).toContain('<p>0</p>');
    });

    it('resolves a default React import', () => {
      const md = `import React from 'react';

export const Boxed = () => React.createElement('span', null, 'boxed');

<Boxed />`;
      expect(renderToHtml(md)).toContain('<span>boxed</span>');
    });

    it('resolves a namespace React import', () => {
      const md = `import * as ReactLib from 'react';

export const Boxed = () => ReactLib.createElement('span', null, 'ns');

<Boxed />`;
      expect(renderToHtml(md)).toContain('<span>ns</span>');
    });

    it('resolves an aliased named import', () => {
      const md = `import { useState as useLocalState } from 'react';

export const Counter = () => {
  const [count] = useLocalState(7);
  return <p>{count}</p>;
};

<Counter />`;
      expect(renderToHtml(md)).toContain('<p>7</p>');
    });

    it('removes the import declaration from the rendered output', () => {
      const md = `import { useState } from 'react';

export const foo = "hello";

Value: {foo}.`;
      const html = mix(md);
      expect(html).not.toContain('import {');
      expect(html).toContain('Value: hello.');
    });

    it('keeps import bindings across multiple exports', () => {
      const md = `import { useState, useMemo } from 'react';

export const useSeed = () => useState(1);
export const Doubler = () => {
  const doubled = useMemo(() => 2 * 2, []);
  return <p>{doubled}</p>;
};

<Doubler />`;
      expect(renderToHtml(md)).toContain('<p>4</p>');
    });

    it('tolerates a condensed single-line import + export', () => {
      const md = "import { useState } from 'react';export const Counter = () => { const [n] = useState(3); return <em>{n}</em>; };\n\n<Counter />";
      expect(renderToHtml(md)).toContain('<em>3</em>');
    });

    it('warns and skips an unsupported library without breaking the rest of the doc', () => {
      const md = `import { clamp } from 'lodash';

export const greeting = "hi";

{greeting}`;
      const html = mix(md);
      expect(html).not.toContain('import {');
      expect(html).toContain('hi');
    });

    it('does not resolve imports in safeMode and keeps them as literal text', () => {
      const md = `import { useState } from 'react';

Plain text.`;
      const html = mix(md, { safeMode: true });
      expect(html).toContain("import { useState } from 'react';");
    });
  });

  describe('class declarations', () => {
    it('exposes class declarations as values', () => {
      const md = `export class MyClass {
  greet() { return "hi"; }
}

Greeting: {new MyClass().greet()}.`;
      expect(mix(md)).toContain('Greeting: hi.');
    });
  });

  describe('variable naming semantics', () => {
    it('accepts lowercase JSX function declarations as a component', () => {
      const md = 'export function greeting() { return (<div>hello</div>); }\n\n<greeting />';
      expect(renderToHtml(md)).toContain('<div>hello</div>');
    });
  });

  describe('using exported variables and functions: {variable} vs Function() vs <Component />', () => {
    it('only evaluates variables inside {...} expressions', () => {
      const md = 'export const variable = "hello";\n\nHi {variable}.\n\nvariable should literally be variable';
      const html = mix(md);
      expect(html).toContain('Hi hello.');
      expect(html).toContain('variable should literally be variable');
    });

    it('only evaluates Function() inside {...} expressions', () => {
      const md = 'export function Greeting() { return "Hello World"; }\n\nHi {Greeting()}.\n\nGreeting() should literally be Greeting()';
      const html = mix(md);
      expect(html).toContain('Hi Hello World.');
      expect(html).toContain('Greeting() should literally be Greeting()');
    });

    it('using <Component /> does not need to be wrapped in {...} expressions', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n<Greeting />';
      expect(renderToHtml(md)).toContain('<div>hello</div>');
    });

    it('evaluates <Component /> when declared inside {...} expressions', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n{<Greeting />}.';
      const html = renderToHtml(md);
      expect(html).toContain('<div>hello</div>');
      expect(html).not.toContain('{<Greeting />}.');
    });
  });

  describe('usage in components', () => {
    describe('readme components', () => {
      it('resolves variable interpolations inside a Callout body', () => {
        const md = `export const product = "RDMD";

<Callout icon="📘" theme="info">
  Welcome to {product}!
</Callout>`;
        expect(renderToHtml(md)).toContain('Welcome to RDMD!');
      });

      it('resolves function calls inside a Callout body', () => {
        const md = `export function shout(s) { return s.toUpperCase(); }

<Callout icon="📘" theme="info">
  {shout("hello")}
</Callout>`;
        expect(renderToHtml(md)).toContain('HELLO');
      });

      it('resolves JSX-returning function calls inside a Callout body', () => {
        const md = `export function Bold(s) { return (<strong>{s}</strong>); }

<Callout icon="📘" theme="info">
  Hi {Bold("world")}!
</Callout>`;
        expect(renderToHtml(md)).toContain('<strong>world</strong>');
      });

      it('resolves variable interpolations inside a Tab body', () => {
        const md = `export const greeting = "hello";

<Tabs>
  <Tab title="Overview">Says {greeting}.</Tab>
  <Tab title="Detail">More info.</Tab>
</Tabs>`;
        expect(renderToHtml(md)).toContain('Says hello.');
      });

      it('resolves variable interpolations inside a JSX Table', () => {
        const md = `export const greeting = "hello";

<Table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Hello</td><td>Greeting: {greeting}</td></tr>
  </tbody>
</Table>`;
        expect(renderToHtml(md)).toContain('Greeting: hello');
      });

      it('resolves variable interpolations inside a native <table> element', () => {
        const md = `export const greeting = "hello";

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Greeting: {greeting}</td></tr>
  </tbody>
</table>`;
        expect(renderToHtml(md)).toContain('Greeting: hello');
      });

      it('does not resolve variable interpolations inside a CodeTabs', () => {
        const md = `export const greeting = "hello";

\`\`\`js
Greeting: {greeting}
\`\`\`
\`\`\`js
Greeting: {greeting}
\`\`\`
`;

        expect(renderToHtml(md)).toContain('Greeting: {greeting}');
        expect(renderToHtml(md)).not.toContain('Greeting: hello');
      });

      it('does not resolve variable interpolations inside an HTMLBlock', () => {
        const md = `export const greeting = "hello";

<HTMLBlock>{\`
  <p>Hello {greeting}.</p>
\`}</HTMLBlock>`;
        expect(renderToHtml(md)).toContain('<p>Hello {greeting}.</p>');
        expect(renderToHtml(md)).not.toContain('Hello hello.');
      });
    });

    describe('custom components', () => {
      it('resolves variables passed as children of an in-document component', () => {
        const md = `export const name = "World";
export function Card({ children }) { return (<section>{children}</section>); }

<Card>Hello, {name}!</Card>`;
        expect(renderToHtml(md)).toContain('Hello, World!');
      });

      it('resolves function calls passed as children of an in-document component', () => {
        const md = `export function shout(s) { return s.toUpperCase(); }
export function Card({ children }) { return (<section>{children}</section>); }

<Card>{shout("hello")}</Card>`;
        expect(renderToHtml(md)).toContain('HELLO');
      });

      it('resolves variables passed as children of a caller-provided component', () => {
        const GreeterMd = 'export function Greeter({ children }) { return (<div>{children}</div>); }';
        const compiledGreeter = run(compile(GreeterMd));

        const md = `export const who = "everyone";

<Greeter>Hi {who}!</Greeter>`;
        const html = renderToHtml(md, { components: { Greeter: compiledGreeter } });
        expect(html).toContain('Hi everyone!');
        expect(html).not.toContain('{who}');
      });
    });
  });

  describe('when evaluation is supposed to fail', () => {
    it('falls back to literal text when a const forward-references another const', () => {
      const md = `export const earlier = later + 1;
export const later = 10;

Earlier: {earlier}. Later: {later}.`;
      const html = mix(md);
      expect(html).toContain('{earlier}');
      expect(html).toContain('{later}');
    });

    it('falls back to literal text when a name is redeclared in a later block', () => {
      const md = `export const x = 1;

Prose.

export const x = 2;

x = {x}.`;
      expect(mix(md)).toContain('x = {x}');
    });
  });
});
