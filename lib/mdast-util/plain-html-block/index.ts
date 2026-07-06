import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';

import { createOpaqueHtmlFromMarkdown } from '../mdx-component';

/**
 * mdast-util bridge for the `plainHtmlBlock` micromark construct.
 *
 * Emits an opaque `html` node with the full serialized block source (see
 * `createOpaqueHtmlFromMarkdown`). Since plain HTML blocks carry no `{…}`
 * expressions, `mdxishMdxComponentBlocks` leaves the node literal for rehype-raw.
 */
export function plainHtmlBlockFromMarkdown(): FromMarkdownExtension {
  return createOpaqueHtmlFromMarkdown('plainHtmlBlock');
}
