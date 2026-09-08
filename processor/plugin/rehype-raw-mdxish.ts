import type { Root } from 'hast';
import type { Plugin } from 'unified';

import { raw } from 'hast-util-raw';
import { VFile } from 'vfile';

/**
 * `hast-util-from-parse5` reads the file's text only to build a line index for the
 * root node of each parse, and `hast-util-raw` runs one nested parse per passed-through
 * node and discards that root. With the real document that's O(nodes × doc length):
 * ~1s for a 2k-element JSX grid. A truthy empty file skips the index but keeps the
 * gate that attaches parse5-derived positions to elements.
 */
const EMPTY_FILE = new VFile();

interface Options {
  /** Node types to stitch through parse5 untouched (see `hast-util-raw`). */
  passThrough: string[];
}

/**
 * `rehype-raw` without the per-passthrough-node document re-index. The root keeps the
 * span it had before parse5, which the empty file would otherwise collapse to `1:1`.
 */
export const rehypeRawMdxish: Plugin<[Options], Root> =
  ({ passThrough }) =>
  tree => {
    const result = raw(tree, { passThrough, file: EMPTY_FILE }) as Root;
    result.position = tree.position;
    return result;
  };

export default rehypeRawMdxish;
