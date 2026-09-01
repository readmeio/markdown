import type { RMDXModule } from '../../types';

import React from 'react';

import { mix, mdxish } from '../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../helpers';

describe('evaluateExpressions', () => {
  it('should evaluate numeric operations', () => {
    const content = '{1 + 2 - 1} {4 * 2 / 2}';
    const html = mix(content);
    expect(html).toContain('2 4');
    expect(html).not.toContain('{1 + 2 - 1}');
    expect(html).not.toContain('{4 * 2 / 2}');
  });

  it('should evaluate self-contained inline MDX expressions and replace with results', () => {
    const content = 'Total: {5 * 10} items for {"Test"}';
    const html = mix(content);

    // The expressions should be evaluated and converted to text nodes
    expect(html).toContain('50'); // 5 * 10
    expect(html).toContain('Test');
    expect(html).not.toContain('{5 * 10}');
    expect(html).not.toContain('{"Test"}');
  });

  it('should handle null and undefined expressions', () => {
    const content = 'Before {null} middle {undefined} after';
    const html = mix(content);

    // Null/undefined should render as empty strings
    expect(html).toContain('Before');
    expect(html).toContain('middle');
    expect(html).toContain('after');
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });

  it('should handle object expressions', () => {
    const content = 'Object: {({a: 1, b: 2})}';
    const html = mix(content);

    // Objects should be JSON stringified (account for JSON escaping in stringified output)
    expect(html).toContain('{"a":1,"b":2}');
  });

  it('should evaluate the string operations', () => {
    const content = 'Hello {"world".toUpperCase()} {"world".length}';
    const html = mix(content);
    expect(html).toContain('Hello WORLD 5');
    expect(html).not.toContain('{"world".toUpperCase()}');
    expect(html).not.toContain('{"world".length}');
  });

  it('should preserve expressions in code blocks', () => {
    const content = '```\nconst x = {1 + 1};\n```';
    const html = mix(content);

    // Expressions in code blocks should be preserved
    expect(html).toContain('{1 + 1}');
    expect(html).not.toContain('const x = 2');
  });

  it('should not evaluate operations when not in braces', () => {
    const content = '1 + 2 "world".toUpperCase()';
    const html = mix(content);
    expect(html).toContain(content);
    expect(html).not.toContain('WORLD');
    expect(html).not.toContain('3');
  });

  it('should keep unresolved identifiers as literal text', () => {
    const content = 'Hello {nonexistent}!';
    const html = mix(content);
    expect(html).toContain('{nonexistent}');
  });

  describe('component and variable scope', () => {
    const asModule = (Component: unknown): RMDXModule => ({ default: Component, Toc: null, toc: [] }) as RMDXModule;

    const variables = { user: { name: 'Dee', apps: [{ client_id: '1', name: 'Widgets' }] }, defaults: [] };

    const Block = () => React.createElement('span', { className: 'custom-block' }, 'custom');

    it('should render a built-in component referenced inside an expression', () => {
      const tree = mdxish('{true ? <Callout theme="info">yes</Callout> : null}');

      expect(findElementByTagName(tree, 'Callout')).toMatchObject({
        type: 'element',
        tagName: 'Callout',
        properties: { theme: 'info' },
        children: [{ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'yes' }] }],
      });
    });

    it('should emit the same tree for an expression as for the equivalent plain tag', () => {
      const fromExpression = findElementByTagName(mdxish('{<Callout theme="info">yes</Callout>}'), 'Callout');
      const fromTag = findElementByTagName(mdxish('<Callout theme="info">yes</Callout>'), 'Callout');

      expect(fromExpression).toMatchObject({ tagName: 'Callout', properties: { theme: 'info' } });
      expect(fromExpression?.children).toStrictEqual(fromTag?.children);
    });

    it('should parse markdown in the children of a component inside an expression', () => {
      // The tag reaches `rehypeMdxishComponents` unrendered, so its children go through the same
      // markdown pass a plain tag's would.
      const tree = mdxish('{<Callout theme="info">**yes**</Callout>}');

      expect(findElementByTagName(tree, 'strong')).toMatchObject({
        tagName: 'strong',
        children: [{ type: 'text', value: 'yes' }],
      });
    });

    it('should render components returned from an iterator', () => {
      const tree = mdxish('{[1, 2].map(i => <Callout theme="info" key={i}>{i}</Callout>)}');

      expect(findAllElementsByTagName(tree, 'Callout')).toMatchObject([
        { properties: { theme: 'info' }, children: [{ tagName: 'p', children: [{ value: '1' }] }] },
        { properties: { theme: 'info' }, children: [{ tagName: 'p', children: [{ value: '2' }] }] },
      ]);
    });

    it('should evaluate an expression that spans several lines without leaking into the document', () => {
      const tree = mdxish(['Before', '', '{true', '  ? <Callout theme="info">inside</Callout>', '  : null}', '', 'After'].join('\n'));

      expect(tree.children.filter(child => child.type === 'element')).toMatchObject([
        { tagName: 'p', children: [{ type: 'text', value: 'Before' }] },
        { tagName: 'Callout', properties: { theme: 'info' } },
        { tagName: 'p', children: [{ type: 'text', value: 'After' }] },
      ]);
    });

    it('should lift a block-level result out of the paragraph it was parsed in', () => {
      // `<p>` holds phrasing content only, so a browser closes it before the `<div>` a component
      // renders. Leaving the wrapper in place reparents the DOM and breaks hydration.
      const expression = mdxish('{true ? <Tabs><Tab title="One">a</Tab></Tabs> : null}');
      const tag = mdxish('<Tabs>\n<Tab title="One">\na\n</Tab>\n</Tabs>');

      expect(expression.children.filter(child => child.type === 'element')).toMatchObject([{ tagName: 'Tabs' }]);
      expect(findElementByTagName(expression, 'Tabs')).toStrictEqual(findElementByTagName(tag, 'Tabs'));
    });

    it('should keep an inline result in its paragraph', () => {
      const html = mix('Total: {5 * 10} items');

      expect(html).toBe('<p>Total: 50 items</p>');
    });

    it('should render a caller-supplied component inside an expression', () => {
      const tree = mdxish('{<MyBlock />}', { components: { MyBlock: asModule(Block) } });

      expect(findElementByTagName(tree, 'MyBlock')).toMatchObject({ tagName: 'MyBlock' });
    });

    it('should bind a snake_case component under its PascalCase name', () => {
      const tree = mdxish('{<MyBlock />}', { components: { my_block: asModule(Block) } });

      expect(findElementByTagName(tree, 'my_block')).toMatchObject({ tagName: 'my_block' });
    });

    it('should resolve a component whose registered key differs only in casing', () => {
      // `getComponentName` matches case-insensitively, so `<MyComponent/>` finds `mycomponent`
      // as a plain tag; an expression has to reach the same component.
      const tree = mdxish('{<MyComponent />}', { components: { mycomponent: asModule(Block) } });

      expect(findElementByTagName(tree, 'mycomponent')).toMatchObject({ tagName: 'mycomponent' });
    });

    it.each([
      ['React.memo', React.memo(Block)],
      ['React.forwardRef', React.forwardRef(Block as never)],
    ])('should bind a component wrapped in %s', (_label, Wrapped) => {
      // Wrapped components are objects, not functions, so binding has to key off the components
      // hash rather than the shape of the entry.
      const tree = mdxish('{<Wrapped />}', { components: { Wrapped: asModule(Wrapped) } });

      expect(findElementByTagName(tree, 'Wrapped')).toMatchObject({ tagName: 'Wrapped' });
    });

    it('should prefer an exact component key over a name another key normalizes onto', () => {
      const tree = mdxish('{<CodeTabs />}', {
        components: { CodeTabs: asModule(Block), code_tabs: asModule(Block) },
      });

      expect(findElementByTagName(tree, 'CodeTabs')).toMatchObject({ tagName: 'CodeTabs' });
      expect(findElementByTagName(tree, 'code_tabs')).toBeNull();
    });

    it('should let an in-document export shadow a component of the same name', () => {
      const html = mix('export const Callout = () => <span className="from-export">export</span>\n\n{<Callout />}');

      expect(html).toContain('from-export');
      expect(html).not.toContain('<Callout');
    });

    it('should resolve a sub-component off an exported object', () => {
      const html = mix('export const Foo = { Bar: () => <span className="sub">sub</span> }\n\n{<Foo.Bar />}');

      expect(html).toContain('class="sub"');
      expect(html).not.toContain('{<Foo.Bar />}');
    });

    it('should expose the user variables object to expressions', () => {
      const tree = mdxish('{user.apps.map(app => <Callout theme="info" key={app.name}>{app.name}</Callout>)}', {
        variables,
      });

      expect(findAllElementsByTagName(tree, 'Callout')).toMatchObject([
        { properties: { theme: 'info' }, children: [{ tagName: 'p', children: [{ value: 'Widgets' }] }] },
      ]);
    });

    it('should apply variable defaults for a user property that is not set', () => {
      const html = mix("{user.name + '!'}", { variables: { user: {}, defaults: [{ default: 'Anon', name: 'name' }] } });

      expect(html).toContain('Anon!');
    });

    it('should keep expressions literal when no variables are supplied', () => {
      const html = mix('{user.apps.length}');

      expect(html).toContain('{user.apps.length}');
    });

    it('should keep expressions literal in safeMode', () => {
      const html = mix('{true ? <Callout theme="info">yes</Callout> : null}', { safeMode: true });

      // The braces survive, so nothing was evaluated; the tag inside them is still picked up by
      // the ordinary component pass, as it would be in any other literal text.
      expect(html).toContain('{true ?');
      expect(html).toContain(': null}');
    });

    it('should not let a component shadow a same-named JS global', () => {
      // Only names in tag position are bound, so a `math` component can't capture `Math`.
      const html = mix('{Math.max(1, 2)}', { components: { math: asModule(Block) } });

      expect(html).toContain('<p>2</p>');
      expect(html).not.toContain('{Math.max');
    });

    it('should not treat a less-than comparison as a JSX tag', () => {
      const html = mix("{1 < Infinity ? 'yes' : 'no'}", { components: { infinity: asModule(Block) } });

      expect(html).toContain('yes');
      expect(html).not.toContain('no');
    });
  });
});
