export type SnakeCaseMapping = Record<string, string>;

export interface SnakeCasePreprocessResult {
  content: string;
  mapping: SnakeCaseMapping;
}

/**
 * Replaces snake_case component names with valid HTML placeholders.
 * Required because remark-parse rejects tags with underscores.
 * Example: `<Snake_case />` → `<RdmxSnakeCase0 />`
 */
export function processSnakeCaseComponent(content: string): SnakeCasePreprocessResult {
  // Early exit if no potential snake_case components
  if (!/[A-Z][A-Za-z0-9]*_[A-Za-z0-9_]*/.test(content)) {
    return { content, mapping: {} };
  }

  const mapping: SnakeCaseMapping = {};
  const reverseMap = new Map<string, string>();
  let counter = 0;

  const componentTagPattern = /<(\/?[A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>/g;

  const processedContent = content.replace(componentTagPattern, (match, tagName, attrs, selfClosing) => {
    if (!tagName.includes('_')) {
      return match;
    }

    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.slice(1) : tagName;

    let placeholder = reverseMap.get(cleanTagName);

    if (!placeholder) {
      // eslint-disable-next-line no-plusplus
      placeholder = `RdmxSnakeCase${counter++}`;
      mapping[placeholder] = cleanTagName;
      reverseMap.set(cleanTagName, placeholder);
    }

    const processedTagName = isClosing ? `/${placeholder}` : placeholder;
    return `<${processedTagName}${attrs}${selfClosing}>`;
  });

  return {
    content: processedContent,
    mapping,
  };
}

/**
 * Restores placeholder name to original snake_case name.
 * Uses case-insensitive matching since HTML parsers normalize to lowercase.
 */
export function restoreSnakeCase(placeholderName: string, mapping: SnakeCaseMapping): string {
  if (mapping[placeholderName]) {
    return mapping[placeholderName];
  }

  const lowerName = placeholderName.toLowerCase();
  const matchingKey = Object.keys(mapping).find(key => key.toLowerCase() === lowerName);

  return matchingKey ? mapping[matchingKey] : placeholderName;
}
