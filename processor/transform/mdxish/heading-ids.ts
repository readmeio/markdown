import type { HeadingIdSuffix } from '../../../lib/mdast-util/heading-id';
import type { Heading, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { HEADING_ID_PATTERN } from '../../utils';

const SUFFIX_ID_REGEX = new RegExp(`^\\{#(${HEADING_ID_PATTERN})\\}\\s*$`, 'u');
const SUFFIX_PARTS_REGEX = /^\{([^}]*)\}(\s*)$/;

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

function takeSuffixId(node: Heading): string | undefined {
  const last = node.children.at(-1);
  if (last?.type !== 'mdxishHeadingId') return undefined;
  const id = last.value.match(SUFFIX_ID_REGEX)?.[1];
  if (id) node.children.pop();
  return id;
}

// A suffix that isn't a heading's id is what the parser would otherwise have made of it.
function restoreSuffix(node: HeadingIdSuffix, safeMode: boolean): PhrasingContent[] {
  const parts = node.value.match(SUFFIX_PARTS_REGEX);
  if (safeMode || !parts) return [{ type: 'text', value: node.value, position: node.position }];
  const [, expression, trailing] = parts;
  return [
    { type: 'mdxTextExpression', value: expression, position: node.position },
    ...(trailing ? [{ type: 'text' as const, value: trailing }] : []),
  ];
}

/** Sets a heading's id from a trailing `{#custom-id}`, so its anchor survives translation; `\{#id}` stays text. */
const headingIdsTransformer: Plugin<[{ safeMode?: boolean }?], Root> =
  ({ safeMode = false } = {}) =>
  (tree, file) => {
    visit(tree, 'heading', (node: Heading) => {
      const id = takeSuffixId(node);
      if (!id) return;
      trimTrailingWhitespace(node);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      file.data.explicitHeadingIds = (file.data.explicitHeadingIds ?? new Set()).add(id);
    });

    visit(tree, 'mdxishHeadingId', (node: HeadingIdSuffix, index, parent) => {
      if (!parent || index === undefined) return undefined;
      const restored = restoreSuffix(node, safeMode);
      (parent.children as PhrasingContent[]).splice(index, 1, ...restored);
      return index + restored.length;
    });
  };

export default headingIdsTransformer;
