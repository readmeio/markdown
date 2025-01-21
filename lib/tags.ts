import { visit } from 'unist-util-visit';
import mdast from './mdast';
import { isMDXElement } from '../processor/utils';
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

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
