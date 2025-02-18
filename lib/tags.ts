import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { isMDXElement } from '../processor/utils';

import mdast from './mdast';

const tags = (doc: string) => {
  const set = new Set<string>();

  visit(mdast(doc), isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name?.match(/^[A-Z]/)) {
      set.add(node.name);
    }
  });

  return Array.from(set);
};

export default tags;
