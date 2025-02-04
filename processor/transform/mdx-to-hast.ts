import type { Parents } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import * as Components from '../../components';
import { getAttrs, isMDXElement } from '../utils';

const setData = (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
  if (!node.name) return;
  if (!(node.name in Components)) return;

  parent.children[index] = {
    ...node,
    data: {
      hName: node.name,
      hProperties: getAttrs(node),
    },
  };
};

const mdxToHast = (): Transform => tree => {
  visit(tree, isMDXElement, setData);

  return tree;
};

export default mdxToHast;
