import { MdastComponents } from '../../types';
import { visit } from 'unist-util-visit';
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { Transform } from 'mdast-util-from-markdown';
import { Parents } from 'mdast';
import { isMDXElement } from '../utils';

interface Options {
  components?: MdastComponents;
}

const inject =
  ({ components }: Options = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: Parents) => {
    if (!(node.name in components)) return;

    const { children } = components[node.name];
    parent.children.splice(index, children.length, ...(children as any));
  };

const injectComponents = (opts: Options) => (): Transform => tree => {
  visit(tree, isMDXElement, inject(opts));

  return tree;
};

export default injectComponents;
