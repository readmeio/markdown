import type { FootnoteDefinition, Node, RootContent } from 'mdast';

import { visit } from 'unist-util-visit';

/**
 * Collect outer-tree footnote ids so cell re-parses can be primed with
 * placeholder defs and recognize `[^id]` as a `footnoteReference`.
 */
export const collectFootnoteIds = (tree: Node): string[] => {
  const ids = new Set<string>();
  visit(tree, 'footnoteDefinition', (definition: FootnoteDefinition) => {
    if (definition.identifier) ids.add(definition.identifier);
  });
  return [...ids];
};

/**
 * Append placeholder defs so the isolated cell parse tokenizes `[^id]` as a
 * `footnoteReference`, `remark-gfm` requires the def in the same parse context.
 */
export const appendFootnotePlaceholders = (value: string, ids: string[]): string => {
  if (ids.length === 0) return value;
  const placeholders = ids.map(id => `[^${id}]: x`).join('\n');
  const separator = value.endsWith('\n') ? '\n' : '\n\n';
  return `${value}${separator}${placeholders}`;
};

/**
 * Prime an isolated cell parse with placeholder defs so `[^id]` tokenizes as a
 * `footnoteReference` (remark-gfm needs the def in the same context). The defs
 * are prepended, not appended, so an unterminated construct in the cell (e.g. an
 * open code fence, which runs to end-of-input) can't swallow the synthetic text.
 */
export const prependFootnotePlaceholders = (
  value: string,
  ids: string[],
): { input: string; line: number; offset: number } => {
  if (ids.length === 0) return { input: value, line: 0, offset: 0 };
  const prefix = `${ids.map(id => `[^${id}]: x`).join('\n')}\n\n`;
  return { input: `${prefix}${value}`, line: prefix.match(/\n/g)?.length ?? 0, offset: prefix.length };
};

/**
 * Drop the prepended placeholder defs and re-base the surviving cell nodes to
 * content-relative positions, as if the placeholders were never prepended.
 */
export const stripPrependedFootnotes = (children: RootContent[], offset: number, line: number): RootContent[] => {
  if (offset === 0) return children;
  const kept = children.filter(child => (child.position?.start?.offset ?? 0) >= offset);
  kept.forEach(child => {
    visit(child as Node, node => {
      if (node.position?.start) {
        node.position.start.offset = (node.position.start.offset ?? 0) - offset;
        node.position.start.line -= line;
      }
      if (node.position?.end) {
        node.position.end.offset = (node.position.end.offset ?? 0) - offset;
        node.position.end.line -= line;
      }
    });
  });
  return kept;
};
