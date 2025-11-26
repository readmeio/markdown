import type { MixOpts } from './mdxish';

import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

import { mdxish } from './mdxish';

/**
 * This function is a wrapper around the mdxish function to return a string instead of a HAST tree.
 *
 * @see mdxish
 * @param text
 * @param opts
 * @returns
 */
const mix = (text: string, opts: MixOpts = {}): string => {
  const hast = mdxish(text, opts);
  const file = unified().use(rehypeStringify).stringify(hast);
  return String(file);
};

export default mix;
