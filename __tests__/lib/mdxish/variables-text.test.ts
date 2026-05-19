import type { Element, Text } from 'hast';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

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

  describe('code block protection', () => {
    it('does not parse {user.name} inside a fenced code block', () => {
      const tree = mdxish('```\n{user.name}\n```');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).toBeNull();
    });
  });
});
