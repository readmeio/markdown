import type { Root } from 'hast';
import type { Node, Parent } from 'unist';

import { visit } from 'unist-util-visit';

type MaybeScriptNode = Node & { name?: string; tagName?: string };

/**
 * Whether a node would render as a literal DOM `<script>` element.
 *
 * JSX names with an uppercase first letter (`<Script />`) are component
 * references, not literal tags, so they're left alone.
 */
const isScriptNode = (node: MaybeScriptNode): boolean => {
  if (node.type === 'element') {
    return node.tagName?.toLowerCase() === 'script';
  }

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const { name } = node;
    return !!name && name.toLowerCase() === 'script' && name[0] === name[0].toLowerCase();
  }

  return false;
};

/**
 * Removes `<script>` elements from user-provided content so they never reach
 * server-rendered (or client-rendered) HTML. Matches legacy rdmd, which strips
 * script tags via its sanitization schema regardless of safe mode.
 *
 * Explicit `HTMLBlock`s are an intentional exception, matching legacy: their
 * scripts live in a string prop rather than as elements, so they never appear
 * in SSR HTML, and they only execute client-side when the author opts in via
 * `runScripts`.
 */
const rehypeStripScripts = () => {
  return (tree: Root) => {
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (parent && typeof index === 'number' && isScriptNode(node as MaybeScriptNode)) {
        parent.children.splice(index, 1);
        return index;
      }
      return undefined;
    });
  };
};

export default rehypeStripScripts;
