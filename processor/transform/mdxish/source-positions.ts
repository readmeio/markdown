import type { Node } from 'mdast';
import type { Position } from 'unist';

import { createSourcePointMapper, createValueToSourceMapper, mapPositionsToSource } from '../../utils';

export interface ReparsedText {
  /** The node `text` was taken from; its range is the fallback for unmappable nodes. */
  container: { position?: Position; value: string };
  /** Where `text` starts in `container.value`; -1 when it isn't there verbatim. */
  offset: number;
  /** The document `container.position` indexes into. */
  source: string | null | undefined;
  /** The text that was re-parsed, as it appears in `container.value`. */
  text: string;
}

/**
 * Moves the positions of nodes parsed from `derived` (`text`, possibly deindented, trimmed or
 * otherwise reshaped) onto the document, so every position shares one coordinate space.
 */
export const mapReparsedPositions = (roots: Node[], derived: string, reparsed: ReparsedText) => {
  const { text, offset, container, source } = reparsed;
  const toContainerSource = offset < 0 ? null : createValueToSourceMapper(container.position, container.value, source);
  const start = toContainerSource?.(offset);
  const end = toContainerSource?.(offset + text.length);
  const textSource = start && end && source ? source.slice(start.offset, end.offset) : text;
  const toSourcePoint = start && end ? createSourcePointMapper(derived, textSource, start) : null;
  mapPositionsToSource(roots, toSourcePoint, container.position);
};

/** Splices `replacements` over `parent.children[index]`. */
export const replaceChild = (parent: { children: Node[] }, index: number, replacements: Node[]) => {
  parent.children.splice(index, 1, ...replacements);
};
