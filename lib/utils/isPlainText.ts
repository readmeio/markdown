import { MAGIC_BLOCK_REGEX } from './extractMagicBlocks';

/**
 * Detects if content contains HTML, magic blocks, or MDX syntax.
 *
 * We can use this in some pipelines to determine if we should have to parse content through
 * `.plain() or if it is already plain text and it should be able to detect everything that would
 * be stripped or sanitized by `.plain()`.
 *
 */
export default function isPlainText(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return true;
  }

  // Exclude markdown code blocks and inline code to avoid false positives
  // Match code blocks with optional language identifier: ```lang\n...\n```
  const codeBlockRegex = /```[^\n]*\n[\s\S]*?```/g;
  // Match inline code: `code` (but not escaped backticks)
  const inlineCodeRegex = /`[^`\n]+`/g;

  // Remove code blocks and inline code to avoid false positives
  let contentWithoutCode = structuredClone(content);
  contentWithoutCode = contentWithoutCode.replace(codeBlockRegex, '');
  contentWithoutCode = contentWithoutCode.replace(inlineCodeRegex, '');

  // Check for magic blocks: `[block:TYPE]...[/block]`
  // Only check after removing code blocks to avoid detecting magic blocks in code
  if (contentWithoutCode.match(MAGIC_BLOCK_REGEX) !== null) {
    return false;
  }

  // Check for markdown links: [text](url) or [text][reference]
  // Pattern matches inline links and reference-style links
  // Exclude images which start with ! before the bracket
  // Only check after removing code blocks
  const markdownLinkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)|(?<!!)\[([^\]]+)\]\[([^\]]*)\]/;
  if (markdownLinkPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown headings: # Title, ## Title, etc.
  // Must be at start of line or after whitespace, followed by space
  // Only check after removing code blocks
  const headingPattern = /(^|\n)\s*#{1,6}\s+\S/m;
  if (headingPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown bold: **text** or __text__
  // Must have content between the markers
  // Only check after removing code blocks
  const boldPattern = /\*\*[^\s*]([^*]*[^\s*])?\*\*|__[^\s_]([^_]*[^\s_])?__/;
  if (boldPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown italic: *text* or _text_
  // Must have content between the markers and not be part of bold
  // Only check after removing code blocks
  const italicPattern = /(?<!\*)\*[^\s*]([^*]*[^\s*])?\*(?!\*)|(?<!_)_[^\s_]([^_]*[^\s_])?_(?!_)/;
  if (italicPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown strikethrough: ~~text~~
  // Must have content between the markers
  // Only check after removing code blocks
  const strikethroughPattern = /~~[^\s~]([^~]*[^\s~])?~~/;
  if (strikethroughPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown lists: - item, * item, + item, or 1. item
  // Must be at start of line or after whitespace
  // Only check after removing code blocks
  const listPattern = /(^|\n)\s*([-*+]|\d+\.)\s+\S/m;
  if (listPattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown blockquotes: > text
  // Must be at start of line or after whitespace
  // Only check after removing code blocks
  const blockquotePattern = /(^|\n)\s*>\s+\S/m;
  if (blockquotePattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown horizontal rules: ---, ***, ===
  // Must be at least 3 characters, at start of line or after whitespace
  // Only check after removing code blocks
  const horizontalRulePattern = /(^|\n)\s*([-*=]{3,})\s*(\n|$)/m;
  if (horizontalRulePattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for markdown tables: | col1 | col2 |
  // Must have at least one pipe character with content
  // Only check after removing code blocks
  const tablePattern = /\|([^\n]*\|[^\n]*)+\|/;
  if (tablePattern.test(contentWithoutCode)) {
    return false;
  }

  // Check for JSX elements (PascalCase components) in the original content
  // This includes code blocks since JSX code examples should be detected
  // Pattern matches:
  // - Self-closing: <Component /> or <Component/>
  // - With attributes: <Component prop="value" />
  // - With children: <Component>...</Component>
  // Use simpler, safer patterns to avoid ReDoS from backtracking
  // Match self-closing tags with bounded attribute length to prevent excessive backtracking
  const jsxSelfClosingPattern = /<[A-Z][a-zA-Z0-9]*(?:\s[^>]{0,50})?\/>/;
  if (jsxSelfClosingPattern.test(content)) {
    return false;
  }

  // For components with children, use a safer pattern that limits backtracking
  // Match opening tag with bounded attributes, then look for closing tag with same name
  const jsxWithChildrenPattern = /<([A-Z][a-zA-Z0-9]*)(?:\s[^>]{0,50})?>[\s\S]{0,50}<\/\1>/;
  if (jsxWithChildrenPattern.test(content)) {
    return false;
  }

  // Check for MDX expressions and HTML tags in the original content
  // HTML/JSX/MDX in code blocks should be detected (as per test requirements)
  // But exclude inline code that contains magic block patterns to avoid false positives
  let contentForHtmlMdx = content;

  // Find inline code blocks and check if they contain [block: pattern
  // Exclude these from HTML/MDX detection to avoid false positives
  const inlineCodePattern = /`[^`\n]+`/g;
  let inlineCodeMatch: RegExpExecArray | null;
  inlineCodePattern.lastIndex = 0;
  while ((inlineCodeMatch = inlineCodePattern.exec(content)) !== null) {
    if (inlineCodeMatch[0].includes('[block:')) {
      contentForHtmlMdx = contentForHtmlMdx.replace(inlineCodeMatch[0], '');
    }
  }

  // Match simple MDX variable expressions like {variable}, {user.name}, {getValue()}, {}
  // Use bounded quantifier to prevent ReDoS - limit to reasonable variable name length
  // Allow empty braces {} to be detected as well
  const jsxExpressionPattern = /\{[^}"]{0,50}\}/;
  if (jsxExpressionPattern.test(contentForHtmlMdx)) {
    return false;
  }

  // Match HTML tags with bounded attribute length to prevent ReDoS
  const htmlTagPattern = /<[a-z][a-z0-9]*(?:\s[^>]{0,50})?(?:\/>|>)/i;
  if (htmlTagPattern.test(contentForHtmlMdx)) {
    return false;
  }

  return true;
}
