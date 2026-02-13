import type { Element } from 'hast';

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
});
