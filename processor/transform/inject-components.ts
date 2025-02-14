import type { MdastComponents } from '../../types';
import type { Parents } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { isMDXElement } from '../utils';

interface Options {
  components?: MdastComponents;
}

const inject =
  ({ components }: Options = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
    if (!(node.name in components)) return;

    const { children } = components[node.name];
    parent.children.splice(index, children.length, ...children);
  };

const injectComponents = (opts: Options) => (): Transform => tree => {
  visit(tree, isMDXElement, inject(opts));

  return tree;
};

export default injectComponents;
