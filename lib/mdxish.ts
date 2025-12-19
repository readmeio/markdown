import type { CustomComponents } from '../types';
import type { Root } from 'hast';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import calloutTransformer from '../processor/transform/callouts';
import codeTabsTransformer from '../processor/transform/code-tabs';
import embedTransformer from '../processor/transform/embeds';
import gemojiTransformer from '../processor/transform/gemoji+';
import imageTransformer from '../processor/transform/images';
import evaluateExpressions from '../processor/transform/mdxish/evaluate-expressions';
import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import mdxishHtmlBlocks from '../processor/transform/mdxish/mdxish-html-blocks';
import magicBlockRestorer from '../processor/transform/mdxish/mdxish-magic-blocks';
import mdxishTables from '../processor/transform/mdxish/mdxish-tables';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/mdxish/preprocess-jsx-expressions';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';

import { extractMagicBlocks } from './utils/extractMagicBlocks';
import { loadComponents } from './utils/mdxish/mdxish-load-components';

export interface MdxishOpts {
  components?: CustomComponents;
  format?: string;
  jsxContext?: JSXContext;
  useTailwind?: boolean;
}

const defaultTransformers = [codeTabsTransformer, gemojiTransformer, embedTransformer];

/**
 * Process markdown content with MDX syntax support.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {}, jsxContext = {}, useTailwind, format } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Preprocess content: extract legacy magic blocks and evaluate JSX attribute expressions
  const { replaced, blocks } = extractMagicBlocks(mdContent);
  const processedContent = preprocessJSXExpressions(replaced, jsxContext);

  // Create string map of components for tailwind transformer
  const tempComponentsMap = Object.entries(components).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  const processor = unified()
    .data('micromarkExtensions', [mdxExpression({ allowEmpty: true })]) // Parse inline JSX expressions as AST nodes for later evaluation
    .data('fromMarkdownExtensions', [mdxExpressionFromMarkdown()])
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(magicBlockRestorer, { blocks })
    .use(imageTransformer, { isMdxish: true })
    .use(calloutTransformer, { format })
    .use(defaultTransformers)
    .use(mdxishComponentBlocks)
    .use(mdxishTables)
    .use(mdxishHtmlBlocks)
    .use(evaluateExpressions, { context: jsxContext }) // Evaluate MDX expressions using jsxContext
    .use(variablesTextTransformer) // Parse {user.*} patterns from text (can't rely on remarkMdx)
    .use(useTailwind ? tailwindTransformer : undefined, { components: tempComponentsMap })
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers })
    .use(rehypeRaw, { passThrough: ['html-block'] })
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
