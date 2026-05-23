import type { Insert } from './utils';
import type { Node } from 'mdast';
/**
 * Walk `tree`, translating every node's position from the repaired source's
 * coordinate space back to the original source. Offsets are remapped via the
 * insert list; line/column are recomputed from the original source so they
 * remain accurate even if repairs introduced newlines.
 */
export declare const remapPositionsToOriginal: (tree: Node, originalSource: string, inserts: Insert[]) => void;
