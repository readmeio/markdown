import type { Root } from 'hast';

import { stripDangerousHtml } from './dangerous-html';

/**
 * Rehype plugin wrapping the deny-list stripper for the `mdxish` and MDX `compile`
 * pipelines, which can't use the `md` allow-list because custom components must
 * survive. Must run after raw HTML is parsed into nodes. See `dangerous-html.ts`.
 */
const rehypeStripDangerousHtml = () => (tree: Root) => {
  stripDangerousHtml(tree);
  return tree;
};

export default rehypeStripDangerousHtml;
