// Base64 encode (Node.js + browser compatible)
function base64Encode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return btoa(unescape(encodeURIComponent(str)));
}

function base64Decode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(str)));
}

// Markers for protected HTMLBlock content
// Add some random characters to the markers to reduce likelihood of conflicts with other content
const HTML_BLOCK_CONTENT_START = 'RMDX-!#@-HTMLBLOCK-START%:';
const HTML_BLOCK_CONTENT_END = ':%RMDX-!#@-HTMLBLOCK-END';

/**
 * Matches HTMLBlock template literal expressions: `<HTMLBlock>{` ... `}</HTMLBlock>`
 */
export const HTMLBLOCK_TEMPLATE_LITERAL_REGEX = /(<HTMLBlock[^>]*>)\{\s*`((?:[^`\\]|\\.)*)`\s*\}(<\/HTMLBlock>)/g;

/**
 * Base64 encodes HTMLBlock template literal content to prevent markdown parser from consuming <script>/<style> tags.
 *
 * @param content
 * @returns Content with HTMLBlock template literals base64 encoded in HTML comments
 * @example
 * ```typescript
 * const input = '<HTMLBlock>{`<script>alert("xss")</script>`}</HTMLBlock>';
 * protectHTMLBlockContent(input)
 * // Returns: '<HTMLBlock>RDMX-HTMLBLOCK-START:PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=:RDMX-HTMLBLOCK-END</HTMLBlock>'
 * ```
 */
export function protectHTMLBlockContent(content: string) {
  return content.replace(
    HTMLBLOCK_TEMPLATE_LITERAL_REGEX,
    (_match, openTag: string, templateContent: string, closeTag: string) => {
      const encoded = base64Encode(templateContent);
      return `${openTag}${HTML_BLOCK_CONTENT_START}${encoded}${HTML_BLOCK_CONTENT_END}${closeTag}`;
    },
  );
}

/**
 * Restores HTMLBlock content that was protected by `protectHTMLBlockContent`.
 * When `withBackticks` is true, re-wraps the decoded body as `{`...`}` (used by `stripComments` to preserve
 * original markup). When false or omitted, inserts decoded HTML only (typical for transformers).
 *
 * @param content
 * @param withBackticks
 * @returns Content with protected markers replaced by decoded HTML, optionally wrapped in template literal syntax
 * @example
 * ```typescript
 * const input =
 *   '<HTMLBlock>RMDX-!#@-HTMLBLOCK-START%:PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=:RMDX-!#@-HTMLBLOCK-END</HTMLBlock>';
 * restoreHTMLBlockContent(input, true);
 * // Returns: '<HTMLBlock>{`<script>alert("xss")</script>`}</HTMLBlock>'
 * restoreHTMLBlockContent(input);
 * // Returns: '<HTMLBlock><script>alert("xss")</script></HTMLBlock>'
 * ```
 */
export function restoreHTMLBlockContent(content: string, withBackticks?: boolean) {
  const markerRegex = new RegExp(`${HTML_BLOCK_CONTENT_START}([A-Za-z0-9+/=]+)${HTML_BLOCK_CONTENT_END}`, 'g');
  return content.replace(markerRegex, (_match, encoded: string) => {
    try {
      const decoded = base64Decode(encoded);
      return withBackticks ? `{\`${decoded}\`}` : decoded;
    } catch {
      return encoded;
    }
  });
}