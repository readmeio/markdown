import { List, RootContent, TableRow } from 'mdast';
import { Transform } from 'mdast-util-from-markdown';

import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { visit, SKIP } from 'unist-util-visit';

import { isMDXElement } from '../utils';
import { Variable } from '../../types';

interface TailwindRootOptions {
  components: Record<string, string>;
  html?: boolean;
}

type JsxParents = Exclude<RootContent, TableRow | List | Variable>;

const injectTailwindRoot =
  ({ components = {} } = {}) =>
  (node: MdxJsxFlowElement | MdxJsxTextElement, index: number, parent: JsxParents) => {
    if (!('name' in node)) return;
    if (!(node.name in components)) return;
    if (!('children' in parent)) return;

    // @ts-ignore - visitor prototype isn't enforcing that the JsxParents
    // matches whether the node is flow or text
    parent.children.splice(index, 1, {
      type: node.type,
      name: 'TailwindRoot',
      attributes: [],
      children: [],
    });

    return SKIP;
  };

const tailwindRoot = (opts: TailwindRootOptions) => {
  return (): Transform => tree => {
    const exports = {};
    const components = { ...opts.components, ...exports };
    visit(tree, isMDXElement, injectTailwindRoot({ components }));

    return tree;
  };
};

export default tailwindRoot;
