import type { MdxishOpts } from './mdxish';

import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

import { mdxish } from './mdxish';

/** Wrapper around mdxish that returns an HTML string instead of a HAST tree. */
const mix = (text: string, opts: MdxishOpts = {}): string => {
  const hast = mdxish(text, opts);
  return String(unified().use(rehypeStringify).stringify(hast));
};

export default mix;
