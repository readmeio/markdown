import { PhrasingContent, BlockContent } from 'mdast';
import { Plugin } from 'unified';

import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { visit, SKIP } from 'unist-util-visit';

import { isMDXElement, toAttributes } from '../utils';

interface TailwindRootOptions {
  components: Record<string, string>;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | typeof SKIP)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | typeof SKIP);

const injectTailwindRoot =
  ({ components = {}, vfile }): Visitor =>
  (node, index, parent) => {
    if (!('name' in node)) return;
    if (!(node.name in components)) return;
    if (!('children' in parent)) return;

    const attrs = {
      flow: node.type === 'mdxJsxFlowElement',
    };

    const wrapper = {
      type: node.type,
      name: 'TailwindRoot',
      attributes: toAttributes(attrs),
      children: [node],
    };

    parent.children.splice(index, 1, wrapper);

    return SKIP;
  };

const tailwindRoot: Plugin<[TailwindRootOptions]> =
  ({ components }) =>
  (tree, vfile) => {
    visit(tree, isMDXElement, injectTailwindRoot({ components, vfile }));

    return tree;
  };

export default tailwindRoot;
