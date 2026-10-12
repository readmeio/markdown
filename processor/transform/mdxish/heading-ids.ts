import type { Heading, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

declare module 'vfile' {
  interface DataMap {
    /** Heading ids set by `{#id}`, which the slug pass must not hand to another heading. */
    explicitHeadingIds?: Set<string>;
  }
}

/**
 * Records every heading id set by `{#id}`, so the slug pass never gives one to another heading.
 * Warns when two headings share an id, since links can only reach the first.
 */
const headingIdsTransformer: Plugin<[], Root> = () => (tree, file) => {
  visit(tree, 'heading', (node: Heading) => {
    const id = node.data?.hProperties?.id;
    if (typeof id !== 'string') return;
    const ids = file.data.explicitHeadingIds ?? new Set<string>();
    file.data.explicitHeadingIds = ids;
    if (ids.has(id)) console.warn(`[mdxish] Heading id "${id}" is used more than once; links reach only the first.`);
    ids.add(id);
  });
};

export default headingIdsTransformer;
