import type { Element } from 'hast';

import { mdxish } from '../../lib';

describe('mdxish-preserve-boolean-properties', () => {
  it('should preserve boolean properties in components', () => {
    const md = `> 🚧
>
> Callout content`;
    const hastTree = mdxish(md);

    const calloutNode = hastTree.children[0] as Element;
    expect(calloutNode.properties?.empty).toBe(true);
    expect(calloutNode.properties?.empty).not.toBe('');
  });
});