import type { Node } from 'mdast';

/**
 * If the cell has exactly one paragraph child, unwrap it so its inline children sit
 * directly under the cell (matches GFM table cell shape and avoids stray `<p>` wrappers).
 *
 * When there are multiple paragraphs, leave them intact — they represent distinct lines
 * of content that need to be preserved for JSX `<Table>` serialization.
 */
export const unwrapSoleParagraph = (children: Node[]): Node[] => {
  const paragraphCount = children.filter(c => c.type === 'paragraph').length;
  if (paragraphCount !== 1) return children;

  return children.flatMap(child => {
    if (child.type === 'paragraph' && 'children' in child && Array.isArray(child.children)) {
      return child.children as Node[];
    }
    return [child];
  });
};
