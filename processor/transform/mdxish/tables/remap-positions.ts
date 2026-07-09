import type { Insert } from './utils';
import type { Node } from 'mdast';

import { visit } from 'unist-util-visit';

/**
 * Build a function that maps an offset in the repaired string back to the
 * original string's coordinate space. Inserts must be sorted by their
 * (original) offset.
 *
 * If a repaired offset falls *inside* synthetic text (i.e. on a character
 * that didn't exist in the original), it clamps to the insert's anchor
 * offset in the original — consumers slicing the original source get the
 * boundary, not garbage.
 */
const buildOffsetMapper = (inserts: Insert[]): ((repaired: number) => number) => {
  // Pre-compute each insert's start in repaired-space.
  let acc = 0;
  const segments = inserts.map(ins => {
    const consumes = ins.consumes ?? 0;
    const repairedStart = ins.offset + acc;
    acc += ins.text.length - consumes;
    return { origOffset: ins.offset, consumes, len: ins.text.length, repairedStart };
  });

  return (repaired: number): number => {
    // Offsets inside an insert's synthetic span have no original counterpart;
    // clamp to the insert's anchor so consumers slice a real boundary.
    const hit = segments.find(seg => seg.repairedStart < repaired && repaired < seg.repairedStart + seg.len);
    if (hit) return hit.origOffset;
    const shift = segments.reduce(
      (acc2, seg) => (seg.repairedStart < repaired ? acc2 + seg.len - seg.consumes : acc2),
      0,
    );
    return repaired - shift;
  };
};

/**
 * Compose the per-repair offset mappers into one that maps an offset in the
 * fully-repaired string back to the original. `layers` are in application
 * order; each maps its own output space to its input space, so we apply them
 * last-repair-first to peel every edit back to the original coordinates.
 */
const composeOffsetMapper = (layers: Insert[][]): ((repaired: number) => number) => {
  const mappers = layers.map(buildOffsetMapper);
  return (repaired: number): number => {
    let offset = repaired;
    for (let i = mappers.length - 1; i >= 0; i -= 1) offset = mappers[i](offset);
    return offset;
  };
};

/**
 * Map an offset in `source` to its 1-based `{ line, column }`. `lineStarts`
 * is the precomputed array of offsets where each line begins.
 */
const offsetToLineCol = (lineStarts: number[], offset: number): { column: number; line: number } => {
  // Binary search for the greatest lineStart <= offset.
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lineStarts[lo] + 1 };
};

const computeLineStarts = (source: string): number[] => {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
};

/**
 * Walk `tree`, translating every node's position from the repaired source's
 * coordinate space back to the original source via `mapOffset`. Line/column
 * are recomputed from the original source so they remain accurate even if
 * repairs introduced newlines.
 */
const remapWithMapper = (tree: Node, originalSource: string, mapOffset: (repaired: number) => number): void => {
  const lineStarts = computeLineStarts(originalSource);

  visit(tree, child => {
    if (child.position?.start) {
      const origOffset = mapOffset(child.position.start.offset ?? 0);
      const { line, column } = offsetToLineCol(lineStarts, origOffset);
      child.position.start.offset = origOffset;
      child.position.start.line = line;
      child.position.start.column = column;
    }
    if (child.position?.end) {
      const origOffset = mapOffset(child.position.end.offset ?? 0);
      const { line, column } = offsetToLineCol(lineStarts, origOffset);
      child.position.end.offset = origOffset;
      child.position.end.line = line;
      child.position.end.column = column;
    }
  });
};

/**
 * Remap positions produced from a single-repair string back to the original.
 */
export const remapPositionsToOriginal = (tree: Node, originalSource: string, inserts: Insert[]): void => {
  if (inserts.length === 0) return;
  remapWithMapper(tree, originalSource, buildOffsetMapper(inserts));
};

/**
 * Remap positions produced after a chain of repairs (each applied to the prior
 * one's output) back to the original source coordinates.
 */
export const remapPositionsThroughLayers = (tree: Node, originalSource: string, layers: Insert[][]): void => {
  if (layers.length === 0) return;
  remapWithMapper(tree, originalSource, composeOffsetMapper(layers));
};
