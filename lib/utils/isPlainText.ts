/**
 * Detects if content contains HTML, magic blocks, or MDX syntax.
 *
 * We can use this in some pipelines to determine if we should have to parse content through
 * `.plain() or if it is already plain text and it should be able to detect everything that would
 * be stripped or sanitized by `.plain()`.
 *
 */
export function isPlainText(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
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

  // Check for magic blocks: `[block:TYPE]...[/block]
  // Must have both opening and closing tags
  // Only check after removing code blocks to avoid detecting magic blocks in code
  const magicBlockPattern = /\[block:[^\]]{1,100}\][\s\S]*?\[\/block\]/;
  if (magicBlockPattern.test(contentWithoutCode)) {
    return true;
  }

  // Check for markdown links: [text](url) or [text][reference]
  // Pattern matches inline links and reference-style links
  // Exclude images which start with ! before the bracket
  // Only check after removing code blocks
  const markdownLinkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)|(?<!!)\[([^\]]+)\]\[([^\]]*)\]/;
  if (markdownLinkPattern.test(contentWithoutCode)) {
    return true;
  }

  // Check for JSX elements (PascalCase components) in the original content
  // This includes code blocks since JSX code examples should be detected
  // Pattern matches:
  // - Self-closing: <Component /> or <Component/>
  // - With attributes: <Component prop="value" />
  // - With children: <Component>...</Component>
  const jsxElementPattern = /<[A-Z][a-zA-Z0-9]*(?:\s[^>]*)?(\/>|>[\s\S]*?<\/[A-Z][a-zA-Z0-9]*>)/;
  if (jsxElementPattern.test(content)) {
    return true;
  }

  // Check for MDX expressions and HTML tags in the original content
  // But exclude code blocks and inline code that contain magic block patterns
  // to avoid false positives from HTML in JSON strings inside magic blocks
  // Use a safer approach to avoid ReDoS: find code blocks first, then check if they contain [block:
  let contentForHtmlMdx = content;

  // Find code blocks using the same pattern as above, then check if they contain [block:
  // This avoids ReDoS by using a two-step process instead of nested quantifiers
  const codeBlockPattern = /```[^\n]*\n[\s\S]*?```/g;
  const codeBlockMatch = codeBlockPattern.exec(content);
  if (codeBlockMatch !== null) {
    if (codeBlockMatch[0].includes('[block:')) {
      contentForHtmlMdx = contentForHtmlMdx.replace(codeBlockMatch[0], '');
    }
  }

  // Find inline code blocks and check if they contain [block: pattern
  const inlineCodePattern = /`[^`\n]+`/g;
  const inlineCodeMatch = inlineCodePattern.exec(content);
  if (inlineCodeMatch !== null) {
    if (inlineCodeMatch[0].includes('[block:')) {
      contentForHtmlMdx = contentForHtmlMdx.replace(inlineCodeMatch[0], '');
    }
  }

  const jsxExpressionPattern = /\{[^}"]{1,}\}/;
  if (jsxExpressionPattern.test(contentForHtmlMdx)) {
    return true;
  }

  const htmlTagPattern = /<[a-z][a-z0-9]*(?:\s[^>]*)?(?:\/>|>)/i;
  if (htmlTagPattern.test(contentForHtmlMdx)) {
    return true;
  }

  return false;
}
