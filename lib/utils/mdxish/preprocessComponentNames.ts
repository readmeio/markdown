/**
 * Mapping between placeholder component names and original names with underscores
 */
export type ComponentNameMapping = Record<string, string>;

/**
 * Result of preprocessing component names
 */
export interface PreprocessResult {
  content: string;
  mapping: ComponentNameMapping;
}

/**
 * Preprocesses component names with underscores by replacing them with placeholders.
 *
 * WHY THIS IS NECESSARY:
 * The remark-parse library (the markdown parser) has strict rules about what constitutes
 * a valid HTML tag name. According to HTML spec, tag names cannot contain underscores.
 *
 * THE SOLUTION:
 * 1. BEFORE parsing: Replace `<Snake_case />` with `<RdmxSnakeCase0 />`
 * 2. Parser sees valid HTML: Creates an HTML node that can be processed
 * 3. AFTER parsing: Restore the original name `Snake_case` in the AST
 *
 * @param content - The raw markdown content
 * @returns Object containing processed content and mapping to restore names
 */
export function preprocessComponentNames(content: string): PreprocessResult {
  const mapping: ComponentNameMapping = {};
  let counter = 0;

  // Match all component-style tags that start with uppercase letter
  // Captures: opening/closing slash, tag name, attributes, self-closing slash
  const componentTagPattern = /<(\/?[A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>/g;

  const processedContent = content.replace(componentTagPattern, (match, tagName, attrs, selfClosing) => {
    // Only process tags that contain underscores
    if (!tagName.includes('_')) {
      return match;
    }

    // Handle closing tags (e.g., </Snake_case>)
    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.slice(1) : tagName;

    // Reuse existing placeholder if we've seen this component name before
    let placeholder = Object.keys(mapping).find(key => mapping[key] === cleanTagName);

    if (!placeholder) {
      // Generate unique placeholder that is guaranteed to be valid HTML
      // Format: RdmxSnakeCase0, RdmxSnakeCase1, etc.
      // eslint-disable-next-line no-plusplus
      placeholder = `RdmxSnakeCase${counter++}`;
      mapping[placeholder] = cleanTagName;
    }

    const processedTagName = isClosing ? `/${placeholder}` : placeholder;
    const result = `<${processedTagName}${attrs}${selfClosing}>`;

    return result;
  });

  return {
    content: processedContent,
    mapping,
  };
}

/**
 * Restores original component name with underscores from placeholder
 *
 * IMPORTANT: This function performs case-insensitive lookups because HTML parsers
 * normalize tag names to lowercase. So even though we generate placeholders like
 * "RdmxSnakeCase0", the AST might contain "rdmxsnakecase0".
 *
 * @param placeholderName - The placeholder name (e.g., "RdmxSnakeCase0" or "rdmxsnakecase0")
 * @param mapping - The mapping from preprocessing
 * @returns The original component name (e.g., "Snake_case") or input if not found
 */
export function restoreComponentName(placeholderName: string, mapping: ComponentNameMapping): string {
  // Try exact match first (fastest path)
  if (mapping[placeholderName]) {
    return mapping[placeholderName];
  }

  // Try case-insensitive match
  // HTML parsers normalize tag names to lowercase, so "RdmxSnakeCase0" becomes "rdmxsnakecase0"
  const lowerName = placeholderName.toLowerCase();
  const matchingKey = Object.keys(mapping).find(key => key.toLowerCase() === lowerName);

  if (matchingKey) {
    // eslint-disable-next-line no-console
    console.log(
      `[restoreComponentName] Case-insensitive match: "${placeholderName}" matched "${matchingKey}" → "${mapping[matchingKey]}"`,
    );
    return mapping[matchingKey];
  }

  // No match found, return original
  return placeholderName;
}
