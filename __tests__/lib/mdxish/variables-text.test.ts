import type { Element, Root, RootContent, Text } from 'hast';

import { mdxish } from '../../../lib';

type HastNode = Root | RootContent;

function findElementByTagName(node: HastNode, tagName: string): Element | null {
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    return node as Element;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.reduce<Element | null>((found, child) => {
      if (found) return found;
      return findElementByTagName(child, tagName);
    }, null);
  }
  return null;
}

function findAllElementsByTagName(node: HastNode, tagName: string): Element[] {
  const results: Element[] = [];
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    results.push(node as Element);
  }
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(child => {
      results.push(...findAllElementsByTagName(child, tagName));
    });
  }
  return results;
}

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

  describe('code block protection', () => {
    it('does not parse {user.name} inside a fenced code block', () => {
      const tree = mdxish('```\n{user.name}\n```');
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).toBeNull();
    });
  });
});
