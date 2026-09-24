import type { Node as EstreeNode, Program } from 'estree';
import type { Nodes, Parents, Root } from 'hast';
import type { Plugin, Transformer } from 'unified';

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
 * Removes matching elements and their subtrees when `sanitize` is enabled.
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

/** The automatic-runtime factories MDX compiles JSX into. */
const JSX_FACTORIES = new Set(['_jsx', '_jsxs', '_jsxDEV']);

/**
 * Matches raw JSX and compiled `_jsx('tag', …)` calls. MDX may rewrite literal
 * tags as `_components.<tag>` so a `components` prop can override them.
 */
const isStrippedJsxElement = (node: EstreeNode): boolean => {
  if (node.type === 'JSXElement') {
    const { name } = node.openingElement;
    if (name.type === 'JSXIdentifier') {
      return LITERAL_TAG_NAME.test(name.name) && STRIPPED_TAG_NAMES.has(name.name.toLowerCase());
    }
    return (
      name.type === 'JSXMemberExpression' &&
      name.object.type === 'JSXIdentifier' &&
      name.object.name === '_components' &&
      STRIPPED_TAG_NAMES.has(name.property.name.toLowerCase())
    );
  }

  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && JSX_FACTORIES.has(node.callee.name)) {
    const [tag] = node.arguments;
    if (!tag) return false;
    if (tag.type === 'Literal') return typeof tag.value === 'string' && STRIPPED_TAG_NAMES.has(tag.value.toLowerCase());
    return (
      tag.type === 'MemberExpression' &&
      tag.object.type === 'Identifier' &&
      tag.object.name === '_components' &&
      tag.property.type === 'Identifier' &&
      STRIPPED_TAG_NAMES.has(tag.property.name.toLowerCase())
    );
  }

  return false;
};

const isEstreeNode = (value: unknown): value is EstreeNode =>
  typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';

const nullLiteral = (): EstreeNode => ({ type: 'Literal', value: null });

/**
 * JSX inside expressions and exports stays in ESTree, outside the HAST pass.
 * Strip it before evaluation in mdxish or after JSX compilation in MDX.
 *
 * Elements are spliced out of JSX children and replaced with `null` anywhere
 * else, which React renders as nothing.
 */
export const stripJsxTags = (program: Program): Program => {
  const walk = (node: EstreeNode) => {
    const record = node as unknown as Record<string, unknown>;

    Object.keys(record).forEach(key => {
      if (key === 'loc' || key === 'range' || key === 'position') return;
      const value = record[key];

      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i -= 1) {
          const child: unknown = value[i];
          if (isEstreeNode(child)) {
            if (isStrippedJsxElement(child)) {
              if (key === 'children') value.splice(i, 1);
              else value[i] = nullLiteral();
            } else {
              walk(child);
            }
          }
        }
        return;
      }

      if (!isEstreeNode(value)) return;
      if (isStrippedJsxElement(value)) {
        record[key] =
          node.type === 'JSXAttribute' ? { type: 'JSXExpressionContainer', expression: nullLiteral() } : nullLiteral();
      } else {
        walk(value);
      }
    });
  };

  walk(program);
  return program;
};

/** `stripJsxTags` as a recma plugin, for the `mdx` compile pipeline. */
export const recmaStripTags: Plugin<[], Program> = () => tree => {
  stripJsxTags(tree);
};
