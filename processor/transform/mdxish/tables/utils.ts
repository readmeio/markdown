import type { Node } from 'mdast';

export interface Insert {
  consumes?: number;
  offset: number;
  text: string;
}

export interface RepairResult {
  inserts: Insert[];
  value: string;
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
 * Replaces every paragraph node with its inline children. Used where paragraphs
 * are parser artifacts (remarkMdx wrapping inline JSX), not real content.
 */
export const unwrapParagraphNodes = (children: Node[]): Node[] => {
  return children.flatMap(child => {
    if (child.type === 'paragraph' && 'children' in child && Array.isArray(child.children)) {
      return child.children as Node[];
    }
    return [child];
  });
};

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

  return unwrapParagraphNodes(children);
};

/**
 * Splice each text into `html` at its offset. Inserts at the same offset
 * are emitted in their input order (a stable sort by offset), so callers can
 * rely on innermost-first ordering by emitting events in stack-unwind order.
 */
export const applyInserts = (html: string, inserts: Insert[]): RepairResult => {
  if (inserts.length === 0) return { value: html, inserts: [] };
  const sorted = [...inserts].sort((a, b) => a.offset - b.offset);

  let out = '';
  let cursor = 0;
  sorted.forEach(({ offset, text, consumes = 0 }) => {
    const clamped = Math.min(Math.max(offset, cursor), html.length);
    if (clamped > cursor) {
      out += html.slice(cursor, clamped);
      cursor = clamped;
    }
    out += text;
    cursor = Math.min(cursor + consumes, html.length);
  });
  return { value: out + html.slice(cursor), inserts: sorted };
};

