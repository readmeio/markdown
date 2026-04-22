import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { remark } from 'remark';
import { visit } from 'unist-util-visit';

import mdxishMdxComponentBlocks from '../processor/transform/mdxish/components/mdx-blocks';
import { isMDXElement } from '../processor/utils';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { mdxComponentFromMarkdown } from './mdast-util/mdx-component';
import { magicBlock } from './micromark/magic-block';
import { mdxComponent } from './micromark/mdx-component';

const tags = (doc: string) => {
  const set = new Set<string>();
  const processor = remark()
    .data('micromarkExtensions', [magicBlock(), mdxComponent()])
    .data('fromMarkdownExtensions', [magicBlockFromMarkdown(), mdxComponentFromMarkdown()])
    .use(mdxishMdxComponentBlocks);
  const tree = processor.parse(doc);

  visit(processor.runSync(tree), isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name?.match(/^[A-Z]/)) {
      set.add(node.name);
    }
  });

  return Array.from(set);
};

export default tags;
