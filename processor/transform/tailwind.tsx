import type { PhrasingContent, BlockContent, Parents, Root, RootContent } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { phrasing } from 'mdast-util-phrasing';
import { visit, SKIP } from 'unist-util-visit';

import { INLINE_ONLY_PARENT_TYPES } from '../../lib/constants';
import { isMDXElement, toAttributes, getExports } from '../utils';

interface TailwindRootOptions {
  components: Record<string, string>;
  parseRoot?: boolean;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | void)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | void);

/** Whitespace-only text is layout between blocks, not inline flow. */
const isInlineContent = (node: RootContent) => phrasing(node) && !(node.type === 'text' && node.value.trim() === '');

/**
 * Whether the child at `index` sits in inline flow: its parent only allows
 * phrasing content (e.g. a paragraph), or it is flanked by phrasing siblings
 * (e.g. `<div>text <Image /> text</div>`, whose children skip the paragraph).
 */
const isInlineInContext = (index: number, parent: Parents) =>
  INLINE_ONLY_PARENT_TYPES.has(parent.type) ||
  parent.children.some((sibling, siblingIndex) => siblingIndex !== index && isInlineContent(sibling));

const injectTailwindRoot =
  ({ components = {} }): Visitor =>
  (node, index, parent) => {
    if (!('name' in node)) return;
    if (!(node.name in components)) return;
    if (!('children' in parent)) return;

    const attrs = {
      flow: node.type === 'mdxJsxFlowElement' && !isInlineInContext(index, parent),
    };

    const wrapper = {
      type: node.type,
      name: 'TailwindRoot',
      attributes: toAttributes(attrs),
      children: [node],
    };

    parent.children.splice(index, 1, wrapper);

    // eslint-disable-next-line consistent-return
    return SKIP;
  };

const tailwind: Plugin<[TailwindRootOptions]> =
  ({ components }) =>
  (tree: Root, vfile: VFile) => {
    const localComponents = getExports(tree).reduce((acc, name) => {
      acc[name] = String(vfile);
      return acc;
    }, {});

    visit(tree, isMDXElement, injectTailwindRoot({ components: { ...components, ...localComponents } }));

    return tree;
  };

export default tailwind;
