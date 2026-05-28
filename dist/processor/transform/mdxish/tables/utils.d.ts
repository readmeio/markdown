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
export declare const tableTags: Set<string>;
/**
 * If the cell has exactly one paragraph child, unwrap it so its inline children sit
 * directly under the cell (matches GFM table cell shape and avoids stray `<p>` wrappers).
 *
 * When there are multiple paragraphs, leave them intact — they represent distinct lines
 * of content that need to be preserved for JSX `<Table>` serialization.
 */
export declare const unwrapSoleParagraph: (children: Node[]) => Node[];
/**
 * Splice each text into `html` at its offset. Inserts at the same offset
 * are emitted in their input order (a stable sort by offset), so callers can
 * rely on innermost-first ordering by emitting events in stack-unwind order.
 */
export declare const applyInserts: (html: string, inserts: Insert[]) => RepairResult;
