import type { Root } from 'hast';

import { stripDangerousHtml } from './dangerous-html';

/**
 * Rehype plugin that strips script-execution vectors (script, MathML/SVG foreign
 * content, event handlers, `javascript:` URLs) introduced by raw HTML / JSX in doc
 * bodies. Shared by the `mdxish` and MDX `compile` pipelines so both engines match
 * the `md` pipeline's sanitization. Must run after raw HTML is parsed into nodes.
 */
const rehypeStripDangerousHtml = () => (tree: Root) => {
  stripDangerousHtml(tree);
  return tree;
};

export default rehypeStripDangerousHtml;
