import type { HeadingIdSuffix } from '../../../lib/mdast-util/heading-id';
import type { Heading, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

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

const isBlank = (node: PhrasingContent) => node.type === 'text' && !node.value.trim();

function takeSuffixId(node: Heading): string | undefined {
  let end = node.children.length;
  while (end > 0 && isBlank(node.children[end - 1])) end -= 1;
  const suffix = node.children[end - 1];
  if (suffix?.type !== 'mdxishHeadingId') return undefined;
  node.children.splice(end - 1);
  return suffix.value.slice(2, -1);
}

// A suffix that isn't a heading's id is what the parser would otherwise have made of it.
const restoreSuffix = (node: HeadingIdSuffix, safeMode: boolean): PhrasingContent =>
  safeMode
    ? { type: 'text', value: node.value, position: node.position }
    : { type: 'mdxTextExpression', value: node.value.slice(1, -1), position: node.position };

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
      (parent.children as PhrasingContent[]).splice(index, 1, restoreSuffix(node, safeMode));
      return index + 1;
    });
  };

export default headingIdsTransformer;
