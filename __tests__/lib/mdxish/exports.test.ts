import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, it, expect } from 'vitest';

import { compile, mdxish, mix, renderMdxish, run } from '../../../lib';
import { findElementByTagName } from '../../helpers';

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
      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);

      const html = renderToStaticMarkup(Content ? React.createElement(Content) : null);
      expect(html).toContain('Hey Ho');
      expect(html).toContain('<div>Hey Ho</div>');
    });

    // Classification policy: `evaluate-exports` inspects each export's declaration
    // AST and routes it based on whether the body contains JSX:
    // - JSX-bearing functions  → scope.components (callable as <Component />)
    // - Everything else        → scope.values     (callable from {...} exprs)
    describe('classification of function exports', () => {
      it('routes JSX-returning functions to scope.components', () => {
        const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
        const tree = mdxish(md);
        expect(Object.keys(tree.data?.mdxishScope?.components ?? {})).toContain('Greeting');
        expect(Object.keys(tree.data?.mdxishScope?.values ?? {})).not.toContain('Greeting');
      });

      it('routes value-returning functions to scope.values', () => {
        // `add` has no JSX in its body — it's a pure value function, so it
        // should be callable from `{add(2, 3)}` expression interpolation.
        const md = 'export function add(a, b) {\n  return a + b;\n}\n\nResult: {add(2, 3)}.';
        const tree = mdxish(md);
        expect(Object.keys(tree.data?.mdxishScope?.values ?? {})).toContain('add');
        expect(Object.keys(tree.data?.mdxishScope?.components ?? {})).not.toContain('add');

        const html = mix(md);
        expect(html).toContain('Result: 5.');
      });

      it('exposes value-returning functions and const values together in expressions', () => {
        const md = 'export const base = 10;\nexport function bump(n) { return n + base; }\n\n{bump(5)}';
        const html = mix(md);
        expect(html).toContain('15');
      });
    });

    it('renders component when called using <Component /> syntax', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n<Greeting />.';
      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);

      expect(Content).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(Content));
      expect(html).toContain('hello');
    });

    it('renders component when called using Component() syntax', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n{Greeting()}.';
      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);

      expect(Content).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(Content));
      expect(html).toContain('<div>hello</div>');
    });
  });

  describe('variable naming semantics', () => {
    it('accepts lowercase JSX function declarations as a component', () => {
      const md = 'export function greeting() { return (<div>hello</div>); }\n\n<greeting />';
      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);

      expect(Content).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(Content));
      expect(html).toContain('<div>hello</div>');
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
      const ast = mdxish(md);

      const { default: Content } = renderMdxish(ast);
      const html = renderToStaticMarkup(React.createElement(Content));
      expect(html).toContain('<div>hello</div>');
    });

    it('evaluates <Component /> when declared inside {...} expressions', () => {
      const md = 'export function Greeting() { return (<div>hello</div>); }\n\n{<Greeting />}.';

      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);
      expect(Content).toBeDefined();
      const html = renderToStaticMarkup(React.createElement(Content));
      expect(html).toContain('<div>hello</div>');
      expect(html).not.toContain('{<Greeting />}.');
    });
  });

  describe('usage in components', () => {
    // Run the full mdxish → renderMdxish → React render pipeline and return the HTML.
    // Needed (instead of `mix`) so caller-provided / in-document components actually execute.
    const renderToHtml = (md: string, opts: Parameters<typeof mdxish>[1] = {}): string => {
      const ast = mdxish(md, opts);
      const { default: Content } = renderMdxish(ast);
      return Content ? renderToStaticMarkup(React.createElement(Content)) : '';
    };

    describe('readme components', () => {
      it('resolves variable interpolations inside a Callout body', () => {
        const md = `
export const product = "RDMD";

<Callout icon="📘" theme="info">
  Welcome to {product}!
</Callout>`;
        expect(renderToHtml(md)).toContain('Welcome to RDMD!');
      });

      it('resolves function calls inside a Callout body', () => {
        const md = `
export function shout(s) { return s.toUpperCase(); }

<Callout icon="📘" theme="info">
  {shout("hello")}
</Callout>`;
        expect(renderToHtml(md)).toContain('HELLO');
      });

      it('resolves JSX-returning function calls inside a Callout body', () => {
        const md = `
export function Bold(s) { return (<strong>{s}</strong>); }

<Callout icon="📘" theme="info">
  Hi {Bold("world")}!
</Callout>`;
        expect(renderToHtml(md)).toContain('<strong>world</strong>');
      });

      it('resolves variable interpolations inside a Tab body', () => {
        const md = `
export const greeting = "hello";

<Tabs>
  <Tab title="Overview">Says {greeting}.</Tab>
  <Tab title="Detail">More info.</Tab>
</Tabs>`;
        expect(renderToHtml(md)).toContain('Says hello.');
      });
    });

    describe('custom components', () => {
      it('resolves variables passed as children of an in-document component', () => {
        const md = `
export const name = "World";
export function Card({ children }) { return (<section>{children}</section>); }

<Card>Hello, {name}!</Card>`;
        expect(renderToHtml(md)).toContain('Hello, World!');
      });

      it('resolves function calls passed as children of an in-document component', () => {
        const md = `
export function shout(s) { return s.toUpperCase(); }
export function Card({ children }) { return (<section>{children}</section>); }

<Card>{shout("hello")}</Card>`;
        expect(renderToHtml(md)).toContain('HELLO');
      });

      it('resolves variables passed as children of a caller-provided component', () => {
        const GreeterMd = 'export function Greeter({ children }) { return (<div>{children}</div>); }';
        const compiledGreeter = run(compile(GreeterMd));

        const md = `
export const who = "everyone";

<Greeter>Hi {who}!</Greeter>`;
        const html = renderToHtml(md, { components: { Greeter: compiledGreeter } });
        expect(html).toContain('Hi everyone!');
        expect(html).not.toContain('{who}');
      });
    });

    describe('magic blocks', () => {
      it('renders exports and a magic-block callout side-by-side', () => {
        const md = `
export const variable = 'exported variable';

[block:callout]
{ "type": "info", "title": "Note", "body": "Hello {variable}!" }
[/block]`;
        const html = renderToHtml(md);
        expect(html).toContain('Hello exported variable!');
      });
    });
  });
});
