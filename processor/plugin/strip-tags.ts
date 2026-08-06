import type { Nodes, Parents, Root } from 'hast';
import type { Transformer } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

/**
 * Tags removed from user-provided content because rendering them executes in the
 * page. Add an entry to cover another vector; nothing else needs to change.
 *
 * Deliberately narrow for now — `<script>` is the only vector this plugin claims
 * to close. Broader parity with the `md` sanitization schema (`javascript:` URLs,
 * `on*` handlers, `<iframe>`, `<object>`, …) is tracked in readmeio/markdown#1526.
 */
export const STRIPPED_TAG_NAMES = new Set(['script']);

/** JSX names starting with a capital are component references, not literal tags. */
const LITERAL_TAG_NAME = /^[a-z]/;

/**
 * Whether a node would render as one of the stripped literal DOM elements.
 * Browsers match tag names case-insensitively, so `<sCrIpT>` executes too.
 *
 * `<Script />` and friends are component references and are left alone.
 */
const isStrippedTag = (node: Nodes): boolean => {
  if (node.type === 'element') return STRIPPED_TAG_NAMES.has(node.tagName.toLowerCase());

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const name = node.name ?? '';
    return LITERAL_TAG_NAME.test(name) && STRIPPED_TAG_NAMES.has(name.toLowerCase());
  }

  return false;
};

/**
 * Removes the `STRIPPED_TAG_NAMES` elements, and their subtrees, from a tree so
 * they never reach rendered HTML. In `md` format `rehypeSanitize` already drops
 * them; this covers the `mdx` and `mdxish` pipelines, which have no sanitization
 * step. Gated behind the `sanitize` option in both.
 *
 * Explicit `HTMLBlock`s are an intentional exception, matching legacy: their
 * scripts live in a string prop rather than as elements, so they never appear
 * in SSR HTML, and they only execute client-side when the author opts in via
 * `runScripts`.
 */
export const rehypeStripTags = (): Transformer<Root, Root> => {
  return (tree: Root) => {
    visit(tree, isStrippedTag, (_node, index: number, parent: Parents) => {
      parent.children.splice(index, 1);
      return [SKIP, index];
    });
  };
};
