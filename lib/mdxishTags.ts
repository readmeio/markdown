import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { remark } from 'remark';
import { visit } from 'unist-util-visit';

import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import { isMDXElement } from '../processor/utils';

import { extractMagicBlocks } from './utils/extractMagicBlocks';

const tags = (doc: string) => {
  const { replaced: sanitizedDoc } = extractMagicBlocks(doc);
  const set = new Set<string>();
  const processor = remark()
    .use(mdxishComponentBlocks);
  const tree = processor.parse(sanitizedDoc);

  visit(processor.runSync(tree), isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name?.match(/^[A-Z]/)) {
      set.add(node.name);
    }
  });

  return Array.from(set);
};

export default tags;
