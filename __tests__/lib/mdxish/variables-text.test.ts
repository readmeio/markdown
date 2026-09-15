import type { Element, Text } from 'hast';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

/** Concatenated text of a subtree, for asserting what stayed literal vs. evaluated. */
const textOf = (node: Element): string =>
  node.children
    .map(child => {
      if (child.type === 'text') return child.value;
      return child.type === 'element' ? textOf(child) : '';
    })
    .join('');

describe('variablesTextTransformer', () => {
  describe('mdxTextExpression nodes (safeMode: false)', () => {
    it('parses {user.email} into a variable node', () => {
      const tree = mdxish('{user.email}');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('email');
    });

    it('parses bracket notation {user["field"]}', () => {
      const tree = mdxish('{user["field"]}');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('field');
    });

    it("parses bracket notation {user['field']}", () => {
      const tree = mdxish("{user['field']}");
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('field');
    });

    it('does not convert partial user paths like {user}', () => {
      // {user} alone is not a user.<field> pattern
      const tree = mdxish('{user}');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).toBeNull();
    });
  });

  describe('text nodes (safeMode: true)', () => {
    it('parses {user.name} into a variable node', () => {
      const tree = mdxish('{user.name}', { safeMode: true });
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('name');
    });

    it('parses inline {user.name} surrounded by text', () => {
      const tree = mdxish('Hello {user.name}!', { safeMode: true });
      const para = tree.children[0] as Element;
      expect(para.children).toHaveLength(3);
      expect((para.children[0] as Text).value).toBe('Hello ');
      expect((para.children[1] as Element).tagName).toBe('variable');
      expect((para.children[1] as Element).properties?.name).toBe('name');
      expect((para.children[2] as Text).value).toBe('!');
    });

    it('parses bracket notation {user["field"]}', () => {
      const tree = mdxish('{user["field"]}', { safeMode: true });
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('field');
    });

    it('does not convert non-user expressions', () => {
      const tree = mdxish('{5 * 10}', { safeMode: true });
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).toBeNull();
    });
  });

  describe('multiple variables', () => {
    it('parses two {user.*} variables in one paragraph', () => {
      const tree = mdxish('{user.name} and {user.email}');
      const variables = findAllElementsByTagName(tree, 'variable');
      expect(variables).toHaveLength(2);
      expect(variables[0].properties?.name).toBe('name');
      expect(variables[1].properties?.name).toBe('email');
    });

    it('preserves text between multiple variables', () => {
      const tree = mdxish('Hi {user.name}, your email is {user.email}.');
      const para = tree.children[0] as Element;
      const variables = findAllElementsByTagName(para, 'variable');
      expect(variables).toHaveLength(2);
      expect((para.children[0] as Text).value).toBe('Hi ');
      expect((para.children[2] as Text).value).toBe(', your email is ');
      expect((para.children[4] as Text).value).toBe('.');
    });
  });

  describe('inside JSX table cells', () => {
    it('parses {user.name} on its own line inside a <Table> cell', () => {
      const tree = mdxish(`<Table>
  <thead>
    <tr>
      <th>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
{user.name}
      </td>
    </tr>
  </tbody>
</Table>`);
      const variables = findAllElementsByTagName(tree, 'variable');
      expect(variables).toHaveLength(1);
      expect(variables[0].properties?.name).toBe('name');
    });

    it('parses {user.name} in both <th> and <td> cells', () => {
      const tree = mdxish(`<Table>
  <thead>
    <tr>
      <th>
        {user.name}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
{user.email}
      </td>
    </tr>
  </tbody>
</Table>`);
      const variables = findAllElementsByTagName(tree, 'variable');
      expect(variables).toHaveLength(2);
      expect(variables[0].properties?.name).toBe('name');
      expect(variables[1].properties?.name).toBe('email');
    });

    it('parses inline {user.name} alongside text in a <Table> cell', () => {
      const tree = mdxish(`<Table>
  <thead>
    <tr>
      <th>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Hello {user.name}!</td>
    </tr>
  </tbody>
</Table>`);
      const variables = findAllElementsByTagName(tree, 'variable');
      expect(variables).toHaveLength(1);
      expect(variables[0].properties?.name).toBe('name');
    });
  });

  // Block-level wrappers used to leave their body raw, so a lone `{user.*}`
  // never reached this transformer and rendered as literal braces.
  describe('inline HTML wrappers', () => {
    it.each(['div', 'p', 'h1', 'h2', 'h3', 'span'])('resolves a sole {user.name} inside <%s>', tag => {
      const tree = mdxish(`<${tag}>{user.name}</${tag}>`);
      const variables = findAllElementsByTagName(tree, 'variable');
      expect(variables).toHaveLength(1);
      expect(variables[0].properties?.name).toBe('name');
    });

    it('keeps a sole {user.name} as phrasing content, not its own paragraph', () => {
      const tree = mdxish('<p>{user.name}</p>');
      const paragraph = findElementByTagName(tree, 'p');
      expect(paragraph!.children).toStrictEqual([expect.objectContaining({ tagName: 'variable' })]);
    });

    it.each([
      ['closing tag on its own line', '<div>{user.name}\n</div>'],
      ['blank line before the closing tag', '<div>{user.name}\n\n</div>'],
      ['blank lines around the reference', '<div>\n\n{user.name}\n\n</div>'],
      ['an indented body', '<div>\n    {user.name}\n</div>'],
    ])('resolves {user.name} in a wrapper with %s', (_, md) => {
      const tree = mdxish(md);
      expect(findAllElementsByTagName(tree, 'variable')).toHaveLength(1);
    });

    it('resolves every {user.*} in a deep tree of mixed tags', () => {
      const tree = mdxish('<div class="card"><h2>{user.name}</h2><p>text {user.email}</p><ul><li>{user.name}</li></ul></div>');
      expect(findAllElementsByTagName(tree, 'variable')).toHaveLength(3);
    });

    it('resolves {user.name} wrapped in HTML inside a component', () => {
      const tree = mdxish('<Callout theme="info"><div>{user.name}</div></Callout>');
      const div = findElementByTagName(tree, 'div');
      expect(findAllElementsByTagName(div!, 'variable')).toHaveLength(1);
    });

    // A body mixing a reference with other expressions: the reference is what earns the
    // promotion, and once promoted the body is ordinary markdown — so sibling expressions
    // evaluate exactly as they already do in any other promoted wrapper.
    it('resolves the reference and evaluates a sibling expression', () => {
      const tree = mdxish('<div>{user.name} {1 + 1}</div>');
      const div = findElementByTagName(tree, 'div');

      expect(findAllElementsByTagName(div!, 'variable')).toHaveLength(1);
      expect(textOf(div!)).toContain('2');
    });

    it('resolves the reference and leaves a CSS-shaped sibling literal', () => {
      const tree = mdxish('<div>{ color: red } {user.name}</div>');
      const div = findElementByTagName(tree, 'div');

      expect(findAllElementsByTagName(div!, 'variable')).toHaveLength(1);
      expect(textOf(div!)).toContain('color: red');
    });

    it('leaves a body of only non-reference expressions untouched', () => {
      const tree = mdxish('<div>{1 + 1} {2 + 2}</div>');
      const div = findElementByTagName(tree, 'div');

      expect(findAllElementsByTagName(div!, 'variable')).toHaveLength(0);
      expect(textOf(div!)).toBe('{1 + 1} {2 + 2}');
    });

    it('resolves both references when a body holds two', () => {
      const tree = mdxish('<div>{user.name} and {user.email}</div>');

      expect(findAllElementsByTagName(tree, 'variable').map(v => v.properties?.name)).toStrictEqual([
        'name',
        'email',
      ]);
    });

    it.each(['{1 + 1}', '{ color: red }'])('leaves %s inside a <div> literal', expression => {
      const tree = mdxish(`<div>${expression}</div>`);
      expect(findElementByTagName(tree, 'variable')).toBeNull();
      expect((findElementByTagName(tree, 'div')!.children[0] as Text).value).toBe(expression);
    });
  });

  describe('code block protection', () => {
    it('does not parse {user.name} inside a fenced code block', () => {
      const tree = mdxish('```\n{user.name}\n```');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).toBeNull();
    });
  });
});
