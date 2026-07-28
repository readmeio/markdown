import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { remark } from 'remark';
import { visit } from 'unist-util-visit';

import mdxishMdxComponentBlocks from '../processor/transform/mdxish/components/mdx-blocks';
import mdxishTables from '../processor/transform/mdxish/tables/mdxish-tables';
import { isMDXElement } from '../processor/utils';

import { mdxishExtensions } from './micromark/mdxish-extensions';

// Only the extensions that can carry a component name: this pipeline collects
// tag names, so gemoji/variables/entities would be parsed for nothing.
const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(['jsxTable', 'magicBlock', 'mdxComponent']);

const tags = (doc: string) => {
  const set = new Set<string>();

  const processor = remark()
    .data('micromarkExtensions', micromarkExtensions)
    .data('fromMarkdownExtensions', fromMarkdownExtensions)
    .use(mdxishMdxComponentBlocks)
    .use(mdxishTables);
  const tree = processor.parse(doc);

  visit(processor.runSync(tree), isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (node.name?.match(/^[A-Z]/)) {
      set.add(node.name);
    }
  });

  return Array.from(set);
};

export default tags;
