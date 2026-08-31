import type { RMDXModule } from '../../types';

import React from 'react';

import { mix } from '../../lib';

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
    const asModule = (Component: React.ComponentType): RMDXModule =>
      ({ default: Component, Toc: null, toc: [] }) as unknown as RMDXModule;

    const variables = { user: { name: 'Dee', apps: [{ client_id: '1', name: 'Widgets' }] }, defaults: [] };

    it('should render a built-in component referenced inside an expression', () => {
      const html = mix('{true ? <Callout theme="info">yes</Callout> : null}');

      expect(html).toContain('callout_info');
      expect(html).toContain('yes');
      expect(html).not.toContain('{true ?');
    });

    it('should render components returned from an iterator', () => {
      const html = mix('{[1, 2].map(i => <Callout theme="info" key={i}>{i}</Callout>)}');

      expect(html.match(/callout_info/g)).toHaveLength(2);
      expect(html).not.toContain('.map(');
    });

    it('should render a caller-supplied component inside an expression', () => {
      const Block = () => React.createElement('span', { className: 'custom-block' }, 'custom');
      const html = mix('{<MyBlock />}', { components: { MyBlock: asModule(Block) } });

      expect(html).toContain('custom-block');
      expect(html).not.toContain('{<MyBlock />}');
    });

    it('should bind a snake_case component under its PascalCase name', () => {
      const Block = () => React.createElement('span', { className: 'custom-block' }, 'custom');
      const html = mix('{<MyBlock />}', { components: { my_block: asModule(Block) } });

      expect(html).toContain('custom-block');
    });

    it('should expose the user variables object to expressions', () => {
      const html = mix('{user.apps.map(app => <Callout theme="info" key={app.name}>{app.name}</Callout>)}', {
        variables,
      });

      expect(html).toContain('Widgets');
      expect(html).toContain('callout_info');
    });

    it('should keep expressions literal when no variables are supplied', () => {
      const html = mix('{user.apps.length}');

      expect(html).toContain('{user.apps.length}');
    });

    it('should keep expressions literal in safeMode', () => {
      const html = mix('{true ? <Callout theme="info">yes</Callout> : null}', { safeMode: true });

      expect(html).toContain('{true ?');
      expect(html).not.toContain('callout_info');
    });

    it('should prefer an exact component key over a name another key normalizes onto', () => {
      const Exact = () => React.createElement('span', { className: 'exact' }, 'exact');
      const Normalized = () => React.createElement('span', { className: 'normalized' }, 'normalized');
      const html = mix('{<CodeTabs />}', {
        components: { CodeTabs: asModule(Exact), code_tabs: asModule(Normalized) },
      });

      expect(html).toContain('exact');
      expect(html).not.toContain('normalized');
    });

    it('should apply variable defaults for a user property that is not set', () => {
      const html = mix("{user.name + '!'}", { variables: { user: {}, defaults: [{ default: 'Anon', name: 'name' }] } });

      expect(html).toContain('Anon!');
    });

    it('should resolve a component whose registered key differs only in casing', () => {
      // `getComponentName` matches case-insensitively, so `<MyComponent/>` finds `mycomponent`
      // as a plain tag; an expression has to reach the same component.
      const Block = () => React.createElement('span', { className: 'custom-block' }, 'custom');
      const html = mix('{<MyComponent />}', { components: { mycomponent: asModule(Block) } });

      expect(html).toContain('custom-block');
      expect(html).not.toContain('{<MyComponent />}');
    });

    it('should not let a component shadow a same-named JS global', () => {
      // Only names in tag position are bound, so a `math` component can't capture `Math`.
      const Block = () => React.createElement('span', null, 'custom');
      const html = mix('{Math.max(1, 2)}', { components: { math: asModule(Block) } });

      expect(html).toContain('<p>2</p>');
      expect(html).not.toContain('{Math.max');
    });

    it('should ignore component names that are not valid JS identifiers', () => {
      // Every scope key becomes a `new Function` parameter, so an unbindable name must be
      // skipped rather than turned into a syntax error for every expression on the page.
      const Block = () => React.createElement('span', null, 'custom');
      const html = mix('{1 + 1}', { components: { 'my-block': asModule(Block) } });

      expect(html).toContain('2');
    });
  });
});
