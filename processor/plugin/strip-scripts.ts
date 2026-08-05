import type { Nodes, Parents, Root } from 'hast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * Whether a node would render as a literal DOM `<script>` element. Browsers match
 * tag names case-insensitively, so `<sCrIpT>` executes too.
 *
 * JSX names with an uppercase first letter (`<Script />`) are component
 * references, not literal tags, so they're left alone.
 */
const isScriptNode = (node: Nodes): boolean => {
  if (node.type === 'element') return node.tagName.toLowerCase() === 'script';

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const name = node.name ?? '';
    return /^[a-z]/.test(name) && name.toLowerCase() === 'script';
  }

  return false;
};

/**
 * Removes literal `<script>` elements from user-provided content so they never
 * reach rendered HTML. In `md` format `rehypeSanitize` already drops them; this
 * covers the `mdx` and `mdxish` pipelines, which have no sanitization step.
 *
 * This only handles `<script>`. Broader parity with the `md` sanitization schema
 * (`javascript:` URLs, `on*` handlers, `<iframe>`, `<object>`, …) is tracked
 * separately in readmeio/markdown#1526.
 *
 * Explicit `HTMLBlock`s are an intentional exception, matching legacy: their
 * scripts live in a string prop rather than as elements, so they never appear
 * in SSR HTML, and they only execute client-side when the author opts in via
 * `runScripts`.
 */
export const rehypeStripScripts = (): Transformer<Root, Root> => {
  return (tree: Root) => {
    visit(tree, isScriptNode, (_node, index: number, parent: Parents) => {
      parent.children.splice(index, 1);
      return index;
    });
  };
};
