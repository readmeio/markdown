import type { Node } from 'mdast';

export interface Insert {
  offset: number;
  text: string;
}


export const tableTags = new Set([
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
  'col',
  'tr',
  'th',
  'td',
]);

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

/**
 * Splice each text into `html` at its offset. Inserts at the same offset
 * are emitted in their input order (a stable sort by offset), so callers can
 * rely on innermost-first ordering by emitting events in stack-unwind order.
 */
export const applyInserts = (html: string, inserts: Insert[]): string => {
  if (inserts.length === 0) return html;
  inserts.sort((a, b) => a.offset - b.offset);

  let out = '';
  let cursor = 0;
  inserts.forEach(({ offset, text }) => {
    const clamped = Math.min(Math.max(offset, cursor), html.length);
    if (clamped > cursor) {
      out += html.slice(cursor, clamped);
      cursor = clamped;
    }
    out += text;
  });
  return out + html.slice(cursor);
};

