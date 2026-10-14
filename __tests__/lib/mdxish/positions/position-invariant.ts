import type { Node, Parent, Point, Position } from 'unist';

import { decodeHTML } from 'entities';
import { visitParents } from 'unist-util-visit-parents';

export type PositionViolationKind =
  | 'missing-position'
  | 'outside-parent'
  | 'point-mismatch'
  | 'shared-point'
  | 'sibling-overlap'
  | 'slice-mismatch';

export interface PositionViolation {
  kind: PositionViolationKind;
  /** Node label, e.g. `text` or `mdxJsxFlowElement<Callout>`. */
  node: string;
  /** Ancestor labels from the root, joined with ` / `. */
  path: string;
  slice?: string;
}

const BACKSLASH_ESCAPE = /\\([!-/:-@[-`{-~])/g;
// Continuation lines carry indentation and `>` markers in the source but not in node values.
const CONTAINER_PREFIX = /\r?\n[ \t>]*/g;

const labelOf = (node: Node) => ('name' in node && node.name ? `${node.type}<${node.name}>` : node.type);

const pointMatches = (source: string, { line, column, offset = -1 }: Point) => {
  const before = source.slice(0, offset);
  return before.split('\n').length === line && offset - before.lastIndexOf('\n') === column;
};

const sameRange = (a: Position, b?: Position) => a.start.offset === b?.start.offset && a.end.offset === b?.end.offset;

// A hard break is its trailing spaces, and the document can start with blank lines.
const WHITESPACE_TYPES = new Set(['break', 'root']);

const normalizeLines = (text: string) => text.replace(CONTAINER_PREFIX, '\n');

// Leading whitespace is fine when it's the first child's own text, e.g. a paragraph split mid-line.
const startsAtFirstChild = (node: Node) =>
  'children' in node &&
  Array.isArray(node.children) &&
  node.children[0]?.position?.start.offset === node.position?.start.offset;

/** Text slices to its value modulo escapes, entities and prefixes; JSX starts at a tag; nothing starts at whitespace. */
const sliceMatches = (node: Node, slice: string) => {
  if (node.type === 'text' || node.type === 'html') {
    const value = 'value' in node ? normalizeLines(String(node.value)) : '';
    const unescaped = decodeHTML(slice.replace(BACKSLASH_ESCAPE, '$1'));
    // Malformed-emphasis repair moves a space across a marker (`Hello** Bold**` → `Hello `).
    const movedSpace = slice === value.trim() && slice !== '';
    return normalizeLines(slice) === value || normalizeLines(unescaped) === value || movedSpace;
  }
  // Magic blocks also build JSX elements (e.g. `<Callout>` from `[block:callout]`).
  if (node.type.startsWith('mdxJsx')) return slice.startsWith('<') || slice.startsWith('[block:');
  return WHITESPACE_TYPES.has(node.type) || startsAtFirstChild(node) || !/^\s/.test(slice);
};

/**
 * Every mdast node must have a position whose points and slice agree with the node, in the
 * source `sourceOf` resolves for it. A node spanning its parent's exact range is synthesized
 * (it has no verbatim source), so it's only checked for containment.
 */
export const findPositionViolations = (tree: Node, sourceOf: (node: Node) => string | undefined) => {
  const violations: PositionViolation[] = [];
  const pointOwners = new Map<object, Node>();

  visitParents(tree, (node, ancestors: Parent[]) => {
    const { position } = node;
    const source = sourceOf(node) ?? '';
    const report = (kind: PositionViolationKind, slice?: string) =>
      violations.push({ kind, node: labelOf(node), path: ancestors.map(labelOf).join(' / '), ...(slice && { slice }) });

    if (position?.start.offset === undefined || position.end.offset === undefined) {
      report('missing-position');
      return;
    }
    const { offset: start } = position.start;
    const { offset: end } = position.end;

    [position, position.start, position.end].forEach(point => {
      if ((pointOwners.get(point) ?? node) !== node) report('shared-point');
      pointOwners.set(point, node);
    });
    if (!pointMatches(source, position.start) || !pointMatches(source, position.end)) report('point-mismatch');

    const parent = ancestors.at(-1);
    const parentRange = parent && sourceOf(parent) === source ? parent.position : undefined;
    const synthesized = sameRange(position, parentRange);
    const slice = source.slice(start, end);
    if (!synthesized && !sliceMatches(node, slice)) report('slice-mismatch', slice);
    if (parentRange && (start < (parentRange.start.offset ?? 0) || end > (parentRange.end.offset ?? 0))) {
      report('outside-parent');
    }

    const previous = parent?.children[parent.children.indexOf(node) - 1];
    const previousRange = previous && sourceOf(previous) === source ? previous.position : undefined;
    const overlaps = previousRange && start < (previousRange.end.offset ?? 0);
    if (overlaps && !synthesized && !sameRange(previousRange, parentRange)) report('sibling-overlap');
  });

  return violations;
};
