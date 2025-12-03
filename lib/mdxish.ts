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
import magicBlockRestorer from '../processor/transform/mdxish-magic-blocks';
import embedTransformer from '../processor/transform/embeds';
import evaluateExpressions from '../processor/transform/evaluate-expressions';
import gemojiTransformer from '../processor/transform/gemoji+';
import imageTransformer from '../processor/transform/images';
import mdxishComponentBlocks from '../processor/transform/mdxish-component-blocks';
import mdxishHtmlBlocks from '../processor/transform/mdxish-html-blocks';
import mdxishTables from '../processor/transform/mdxish-tables';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/preprocess-jsx-expressions';
import tailwindTransformer from '../processor/transform/tailwind';
import variablesTextTransformer from '../processor/transform/variables-text';

import { loadComponents } from './utils/load-components';
import { extractMagicBlocks } from './utils/extractMagicBlocks';

export interface MdxishOpts {
  components?: CustomComponents;
  jsxContext?: JSXContext;
  useTailwind?: boolean;
}

const defaultTransformers = [calloutTransformer, codeTabsTransformer, gemojiTransformer];

/**
 * Process markdown content with MDX syntax support.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {}, jsxContext = {}, useTailwind } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Since we are parsing a mix of markdown & mdx, we need to preprocess some things
  // such as 1) legacy magic blocks, 2) inline JSX expressions manually
  const { replaced, blocks } = extractMagicBlocks(mdContent);
  const processedContent = preprocessJSXExpressions(replaced, jsxContext);

  // Create temp map string to string of components
  const tempComponentsMap = Object.entries(components).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  const processor = unified()
    .data('micromarkExtensions', [mdxExpression({ allowEmpty: true })]) // These 2 extenstions are used to make inline JSX expressions as nodes in the AST, which will be evaluated later
    .data('fromMarkdownExtensions', [mdxExpressionFromMarkdown()])
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(magicBlockRestorer, { blocks })
    .use(imageTransformer, { isMdxish: true })
    .use(defaultTransformers)
    .use(mdxishComponentBlocks)
    .use(mdxishTables)
    .use(mdxishHtmlBlocks)
    .use(embedTransformer)
    .use(evaluateExpressions, { context: jsxContext }) // Evaluate MDX expressions using context
    .use(variablesTextTransformer) // We cant rely in remarkMdx to parse the variable, so we have to parse it manually
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
