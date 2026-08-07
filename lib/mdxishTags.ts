import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { remark } from 'remark';
import { visit } from 'unist-util-visit';

import mdxishMdxComponentBlocks from '../processor/transform/mdxish/components/mdx-blocks';
import mdxishTables from '../processor/transform/mdxish/tables/mdxish-tables';
import { isMDXElement } from '../processor/utils';

import { FEATURES, mdxishExtensions } from './micromark/mdxish-extensions';

const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.tags, { safeMode: true });

const tags = (doc: string) => {
  const set = new Set<string>();

  const processor = remark()
    .data('micromarkExtensions', micromarkExtensions)
    .data('fromMarkdownExtensions', fromMarkdownExtensions)
    // Tag names never depend on evaluated attribute values, so always parse in safeMode.
    .use(mdxishMdxComponentBlocks, { safeMode: true })
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
