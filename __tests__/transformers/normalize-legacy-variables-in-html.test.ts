import type { Html, Root, Text } from 'mdast';

import { unified } from 'unified';

import normalizeLegacyVariablesInHtml from '../../processor/transform/mdxish/normalize-legacy-variables-in-html';

const run = (tree: Root): Root => {
  unified().use(normalizeLegacyVariablesInHtml).runSync(tree);
  return tree;
};

describe('normalizeLegacyVariablesInHtml', () => {
  it('should convert an inline <Variable>...</Variable> inside an html node to {user.*}', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'html', value: 'welcome to <Variable name="MY_VAR" isLegacy></Variable>.' },
      ],
    };

    const result = run(tree);

    expect((result.children[0] as Html).value).toBe('welcome to {user.MY_VAR}.');
  });

  it('should convert a lowercase <variable> tag (from rehype) inside an html node', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'html', value: 'hello <variable name="FOO" islegacy=""></variable>.' },
      ],
    };

    const result = run(tree);

    expect((result.children[0] as Html).value).toBe('hello {user.FOO}.');
  });

  it('should convert multiple inline variables in a single html node', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'html', value: '<Variable name="A" isLegacy></Variable> and <Variable name="B" isLegacy></Variable>' },
      ],
    };

    const result = run(tree);

    expect((result.children[0] as Html).value).toBe('{user.A} and {user.B}');
  });

  it('should convert a standalone opening tag node (void element from flattener)', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'text', value: 'welcome to ' },
        { type: 'html', value: '<variable name="MY_VAR" islegacy="">' },
        { type: 'text', value: '. Otherwise...' },
      ],
    };

    const result = run(tree);

    expect(result.children).toHaveLength(3);
    expect(result.children[1].type).toBe('text');
    expect((result.children[1] as Text).value).toBe('{user.MY_VAR}');
  });

  it('should convert a standalone opening tag and remove a following closing tag', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'text', value: 'hello ' },
        { type: 'html', value: '<Variable name="FOO" isLegacy>' },
        { type: 'html', value: '</Variable>' },
        { type: 'text', value: ' end' },
      ],
    };

    const result = run(tree);

    expect(result.children).toHaveLength(3);
    expect(result.children[1].type).toBe('text');
    expect((result.children[1] as Text).value).toBe('{user.FOO}');
    expect((result.children[2] as Text).value).toBe(' end');
  });

  it('should handle multiple standalone variable tags in sequence', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'html', value: '<li>' },
        { type: 'text', value: 'hello ' },
        { type: 'html', value: '<variable name="A" islegacy="">' },
        { type: 'text', value: ' and ' },
        { type: 'html', value: '<variable name="B" islegacy="">' },
        { type: 'text', value: ' servers' },
        { type: 'html', value: '</li>' },
      ],
    };

    const result = run(tree);

    const values = result.children.map(n => ('value' in n ? n.value : `[${n.type}]`));
    expect(values).not.toContain(expect.stringContaining('<variable'));
    expect(values).toContain('{user.A}');
    expect(values).toContain('{user.B}');
  });

  it('should not touch html nodes that are not variable tags', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'html', value: '<ul>' },
        { type: 'html', value: '<li>' },
        { type: 'text', value: 'hello' },
        { type: 'html', value: '</li>' },
        { type: 'html', value: '</ul>' },
      ],
    };

    const result = run(tree);

    expect(result.children).toHaveLength(5);
    expect((result.children[0] as Html).value).toBe('<ul>');
  });

  it('should not touch non-html nodes', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'text', value: '<variable name="X" islegacy="">' },
      ],
    };

    const result = run(tree);

    expect((result.children[0] as Text).value).toBe('<variable name="X" islegacy="">');
  });
});
