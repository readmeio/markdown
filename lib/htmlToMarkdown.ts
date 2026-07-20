import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

/**
 * Converts an HTML fragment to GitHub-flavored Markdown.
 *
 * `remark-gfm` is load-bearing: without it, `<table>` and `<del>` input throws
 * at serialization. `script`, `style`, `iframe`, `noscript`, and `template`
 * elements and HTML comments are dropped so raw markup never leaks into the
 * output.
 */
const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemark, {
    // A comment is a `comment` node, not an element, so it goes in
    // `nodeHandlers` rather than `handlers`.
    handlers: {
      iframe: () => undefined,
      noscript: () => undefined,
      script: () => undefined,
      style: () => undefined,
      template: () => undefined,
    },
    nodeHandlers: { comment: () => undefined },
  })
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', emphasis: '_', fences: true });

/**
 * Returns the Markdown form of `html`, or an empty string when there is no
 * usable input. Synchronous, so it can run inside non-async serializers.
 */
export default function htmlToMarkdown(html?: string | null): string {
  if (typeof html !== 'string' || !html.trim()) return '';

  return processor.processSync(html).toString().trim();
}
