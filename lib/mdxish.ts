import type { CustomComponents } from '../types';
import type { Root } from 'hast';

import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import calloutTransformer from '../processor/transform/callouts';
import mdxishComponentBlocks from '../processor/transform/mdxish-component-blocks';
import {
  preprocessJSXExpressions,
  processSelfClosingTags,
  type JSXContext,
} from '../processor/transform/preprocess-jsx-expressions';
import variablesTransformer from '../processor/transform/variables';

import { loadComponents } from './utils/load-components';

export interface MdxishOpts {
  components?: CustomComponents;
  jsxContext?: JSXContext;
}

/**
 * Process markdown content with MDX syntax support.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {}, jsxContext = {} } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  const processedContent = processSelfClosingTags(preprocessJSXExpressions(mdContent, jsxContext));

  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(calloutTransformer)
    .use(mdxishComponentBlocks)
    .use(variablesTransformer, { asMdx: false })
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeMdxishComponents, {
      components,
      processMarkdown: (markdown: string) => mdxish(markdown, opts),
    });

  const vfile = new VFile({ value: processedContent });
  const hast = processor.runSync(processor.parse(processedContent), vfile) as Root;

  if (!hast) {
    throw new Error('Markdown pipeline did not produce a HAST tree.');
  }

  return hast;
}

export default mdxish;
