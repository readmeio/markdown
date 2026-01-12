import type { PhrasingContent, BlockContent, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { visit, SKIP } from 'unist-util-visit';

import { isMDXElement, toAttributes, getExports } from '../utils';

interface TailwindRootOptions {
  components: Record<string, string>;
  parseRoot?: boolean;
}

type Visitor =
  | ((node: MdxJsxFlowElement, index: number, parent: BlockContent) => undefined | void)
  | ((node: MdxJsxTextElement, index: number, parent: PhrasingContent) => undefined | void);

const injectTailwindRoot =
  ({ components = {} }): Visitor =>
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
