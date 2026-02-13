import type { Element, Text } from 'hast';

import { mdxish } from '../../../lib';

describe('legacy variables resolution', () => {
  it('should resolve a long <<>> to a variable node', () => {
    const varName = 'email';
    const md = `<<${varName}>>`;
    const tree = mdxish(md);

    expect(tree.children.length).toBeGreaterThanOrEqual(1);
    expect((tree.children[0] as Element).children).toHaveLength(1);

    const variableNode = (tree.children[0] as Element).children[0] as Element;
    expect(variableNode.tagName).toBe('variable');
    expect(variableNode.properties.name).toBe(varName);
  });

  it('should resolve inline <<>> to a variable node', () => {
    const varName = 'email';
    const md = `Hello <<${varName}>>!`;
    const tree = mdxish(md);

    expect(tree.children.length).toBeGreaterThanOrEqual(1);
    const parent = tree.children[0] as Element;
    expect(parent.children).toHaveLength(3);

    const variableNode = parent.children[1] as Element;
    expect(variableNode.tagName).toBe('variable');
    expect(variableNode.properties.name).toBe(varName);

    expect((parent.children[0] as Text).value).toBe('Hello ');
    expect((parent.children[2] as Text).value).toBe('!');
  });

  it('should resolve <<>> that is surrounded by text', () => {
    const varName = 'email';
    const md = `abcd<<${varName}>>efg`;
    const tree = mdxish(md);

    expect(tree.children.length).toBeGreaterThanOrEqual(1);
    const parent = tree.children[0] as Element;
    expect(parent.children).toHaveLength(3);

    const variableNode = parent.children[1] as Element;
    expect(variableNode.tagName).toBe('variable');
    expect(variableNode.properties.name).toBe(varName);

    expect((parent.children[0] as Text).value).toBe('abcd');
    expect((parent.children[2] as Text).value).toBe('efg');
  });
});
