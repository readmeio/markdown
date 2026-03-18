import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

/**
 * HTML void elements that are legitimately self-closing per the HTML spec.
 * These should NOT be transformed.
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
const HTML_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Matches self-closing HTML tags: `<tagname />` or `<tagname attr="val" />`
 *
 * Captures:
 *  1 - tag name (lowercase letters, digits, hyphens)
 *  2 - attributes (everything between tag name and `/>`)
 *
 * The attribute portion skips over quoted strings (`"..."` and `'...'`) so that
 * a `/>` inside an attribute value (e.g. `title="use /> here"`) does not cause
 * a premature match.
 *
 * Only matches lowercase tag names to avoid interfering with PascalCase
 * JSX custom components (e.g. `<MyComponent />`), which are handled
 * separately by mdxish-component-blocks.
 */
const SELF_CLOSING_TAG_RE = /<([a-z][a-z0-9-]*)((?:\s+(?:[^>"']*(?:"[^"]*"|'[^']*'))*[^>"']*)?)?\s*\/>/g;

/**
 * String-level preprocessor that converts self-closing non-void HTML tags
 * into explicitly closed tags.
 *
 * Problem: `rehype-raw` (via parse5) follows the HTML spec where the `/` in
 * `<i />` is ignored for non-void elements. This causes `<i />` to be parsed
 * as an opening `<i>` tag, which then wraps all subsequent content.
 *
 * Solution: Transform `<i />` → `<i></i>` before parsing, so rehype-raw
 * sees a properly closed element.
 *
 * This preprocessor:
 * - Skips void elements (`<br />`, `<hr />`, `<img />`, etc.)
 * - Skips PascalCase tags (custom components handled elsewhere)
 * - Protects code blocks from transformation
 *
 * @example
 * closeSelfClosingHtmlTags('<i /> text')         // '<i></i> text'
 * closeSelfClosingHtmlTags('<br />')              // '<br />' (void, untouched)
 * closeSelfClosingHtmlTags('<MyComp />')          // '<MyComp />' (PascalCase, untouched)
 * closeSelfClosingHtmlTags('<i class="icon" />') // '<i class="icon"></i>'
 */
export function closeSelfClosingHtmlTags(content: string) {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const result = protectedContent.replace(SELF_CLOSING_TAG_RE, (match, tagName: string, attrs: string) => {
    // Skip void elements (legitimately self-closing)
    if (HTML_VOID_ELEMENTS.has(tagName)) {
      return match;
    }

    // Skip tags with hyphens — these are custom elements (web components)
    // and should not be rewritten (e.g. <my-component />)
    if (tagName.includes('-')) {
      return match;
    }

    const attributes = attrs?.trim() ? ` ${attrs.trim()}` : '';
    return `<${tagName}${attributes}></${tagName}>`;
  });

  return restoreCodeBlocks(result, protectedCode);
}
