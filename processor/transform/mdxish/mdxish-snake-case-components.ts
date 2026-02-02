import { componentTagPattern } from '../../../lib/constants';
import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

export type SnakeCaseMapping = Record<string, string>;

export interface SnakeCasePreprocessResult {
  content: string;
  mapping: SnakeCaseMapping;
}

export interface ProcessSnakeCaseOptions {
  /**
   * Set of known component names
   * Used to filter which snake_case components to transform
  */
  knownComponents?: Set<string>;
}

/**
 * Replaces snake_case component names with valid HTML placeholders.
 * Required because remark-parse rejects tags with underscores.
 * Example: `<Snake_case />` → `<MDXishSnakeCase0 />`
 *
 * Code blocks and inline code are protected and will not be transformed.
 *
 * @param content - The markdown content to process
 * @param options - Options including knownComponents to filter by
 */
export function processSnakeCaseComponent(
  content: string,
  options: ProcessSnakeCaseOptions = {}
): SnakeCasePreprocessResult {
  const { knownComponents } = options;

  // Early exit if no potential snake_case components
  if (!/[A-Z][A-Za-z0-9]*_[A-Za-z0-9_]*/.test(content)) {
    return { content, mapping: {} };
  }

  // Step 1: Extract code blocks to protect them from transformation
  const { protectedCode, protectedContent } = protectCodeBlocks(content);

  // Find the highest existing placeholder number to avoid collisions
  // e.g., if content has <MDXishSnakeCase0 />, start counter from 1
  const placeholderPattern = /MDXishSnakeCase(\d+)/g;
  let startCounter = 0;
  let placeholderMatch: RegExpExecArray | null;
  while ((placeholderMatch = placeholderPattern.exec(content)) !== null) {
    const num = parseInt(placeholderMatch[1], 10);
    if (num >= startCounter) {
      startCounter = num + 1;
    }
  }

  const mapping: SnakeCaseMapping = {};
  const reverseMap = new Map<string, string>();
  let counter = startCounter;

  // Step 2: Transform snake_case components in non-code content
  const processedContent = protectedContent.replace(componentTagPattern, (match, tagName, attrs, selfClosing) => {
    if (!tagName.includes('_')) {
      return match;
    }

    const isClosing = tagName.startsWith('/');
    const cleanTagName = isClosing ? tagName.slice(1) : tagName;

    // Only transform if it's a known component (or if no filter is provided)
    if (knownComponents && !knownComponents.has(cleanTagName)) {
      return match;
    }

    let placeholder = reverseMap.get(cleanTagName);

    if (!placeholder) {
      // eslint-disable-next-line no-plusplus
      placeholder = `MDXishSnakeCase${counter++}`;
      mapping[placeholder] = cleanTagName;
      reverseMap.set(cleanTagName, placeholder);
    }

    const processedTagName = isClosing ? `/${placeholder}` : placeholder;
    return `<${processedTagName}${attrs}${selfClosing}>`;
  });

  // Step 3: Restore code blocks (untouched)
  const finalContent = restoreCodeBlocks(processedContent, protectedCode);

  return {
    content: finalContent,
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
