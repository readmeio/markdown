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

  // Check for magic blocks: `[block:TYPE]...[/block]
  // Must have both opening and closing tags
  // Only check after removing code blocks to avoid detecting magic blocks in code
  const magicBlockPattern = /\[block:[^\]]{1,50}\][\s\S]*?\[\/block\]/;
  if (magicBlockPattern.test(contentWithoutCode)) {
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
