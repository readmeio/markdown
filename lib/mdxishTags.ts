import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { remark } from 'remark';
import { visit } from 'unist-util-visit';

import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import { isMDXElement } from '../processor/utils';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { magicBlock } from './micromark/magic-block';

const tags = (doc: string) => {
  const set = new Set<string>();
  const processor = remark()
    .data('micromarkExtensions', [magicBlock()])
    .data('fromMarkdownExtensions', [magicBlockFromMarkdown()])
    .use(mdxishComponentBlocks);
  const tree = processor.parse(doc);

  visit(processor.runSync(tree), isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name?.match(/^[A-Z]/)) {
      set.add(node.name);
    }
  });

  return Array.from(set);
};

export default tags;
