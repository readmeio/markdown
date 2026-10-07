import type { Heading, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visitParents } from 'unist-util-visit-parents';

import { HEADING_ID_PATTERN } from '../../utils';

import { resolveReparseSource } from './reparse-source';

const EXPRESSION_ID_REGEX = new RegExp(`^#(${HEADING_ID_PATTERN})$`, 'u');
const SOURCE_ID_REGEX = new RegExp(`(?<!\\\\)\\{#(${HEADING_ID_PATTERN})\\}$`, 'u');

declare module 'vfile' {
  interface DataMap {
    /** Heading ids authored as `{#id}`, which the slug pass must not hand to another heading. */
    explicitHeadingIds?: Set<string>;
  }
}

function trimTrailingWhitespace(node: Heading) {
  const last = node.children.at(-1);
  if (last?.type !== 'text') return;
  last.value = last.value.trimEnd();
  if (!last.value) node.children.pop();
}

function takeExpressionId(node: Heading): string | undefined {
  const last = node.children.at(-1);
  if (last?.type !== 'mdxTextExpression') return undefined;
  const id = last.value.match(EXPRESSION_ID_REGEX)?.[1];
  if (id) node.children.pop();
  return id;
}

// Safe mode leaves `{#id}` as text the inline parser already ran over (an escape is gone, `__` in
// an id became emphasis), so the id is matched in the source and every child from its `{` is cut.
function takeSourceId(node: Heading, source: string | undefined): string | undefined {
  const start = node.children[0]?.position?.start.offset;
  const end = node.children.at(-1)?.position?.end.offset;
  if (source === undefined || start === undefined || end === undefined) return undefined;

  const match = source.slice(start, end).match(SOURCE_ID_REGEX);
  if (!match) return undefined;
  const idStart = end - match[0].length;

  const kept = node.children.filter(child => (child.position?.start.offset ?? Infinity) < idStart);
  const straddling = kept.at(-1);
  if (straddling?.type === 'text' && (straddling.position?.end.offset ?? 0) > idStart) {
    straddling.value = straddling.value.slice(0, straddling.value.lastIndexOf('{'));
  }
  node.children = kept;
  return match[1];
}

/** Sets a heading's id from a trailing `{#custom-id}`, so its anchor survives translation; `\{#id}` stays text. */
const headingIdsTransformer: Plugin<[{ safeMode?: boolean }?], Root> =
  ({ safeMode = false } = {}) =>
  (tree, file) => {
    const documentSource = file?.value ? String(file.value) : undefined;

    visitParents(tree, 'heading', (node: Heading, ancestors: Parent[]) => {
      const id = safeMode
        ? takeSourceId(node, resolveReparseSource(node, ancestors, documentSource))
        : takeExpressionId(node);
      if (!id) return;
      trimTrailingWhitespace(node);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      file.data.explicitHeadingIds = (file.data.explicitHeadingIds ?? new Set()).add(id);
    });
  };

export default headingIdsTransformer;
