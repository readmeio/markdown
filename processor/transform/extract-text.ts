/**
 * Extracts text content from a single AST node recursively.
 * Works with both MDAST and HAST-like node structures.
 *
 * Placed this outside of the utils.ts file to avoid circular dependencies.
 *
 * @param node - The node to extract text from (can be MDAST Node or HAST-like structure)
 * @returns The concatenated text content
 */
export const extractText = (node: { children?: unknown[]; type?: string; value?: unknown; alt?: unknown }): string => {
  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value;
  }

  // When a blockquote contains only an image (no text), treat it as having content
  // so the blockquote is no longer treated as empty and preserved correctly.
  if (node.type === 'image') {
    return typeof node.alt === 'string' && node.alt ? node.alt : '[image]';
  }
  
  if (node.children && Array.isArray(node.children)) {
    return node.children
      .map(child => {
        if (child && typeof child === 'object' && 'type' in child) {
          return extractText(child as { children?: unknown[]; type?: string; value?: unknown });
        }
        return '';
      })
      .join('');
  }
  return '';
};
