import type { CustomComponents } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { Extension } from 'micromark-util-types';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { VFile } from 'vfile';

import compilers from '../processor/compile';
import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import calloutTransformer from '../processor/transform/callouts';
import codeTabsTransformer from '../processor/transform/code-tabs';
import embedTransformer from '../processor/transform/embeds';
import gemojiTransformer from '../processor/transform/gemoji+';
import imageTransformer from '../processor/transform/images';
import evaluateExpressions from '../processor/transform/mdxish/evaluate-expressions';
import magicBlockTransformer from '../processor/transform/mdxish/magic-blocks/magic-block-transformer';
import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import mdxishHtmlBlocks from '../processor/transform/mdxish/mdxish-html-blocks';
import mdxishMermaidTransformer from '../processor/transform/mdxish/mdxish-mermaid';
import { processSnakeCaseComponent } from '../processor/transform/mdxish/mdxish-snake-case-components';
import mdxishTables from '../processor/transform/mdxish/mdxish-tables';
import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { normalizeTableSeparator } from '../processor/transform/mdxish/normalize-table-separator';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/mdxish/preprocess-jsx-expressions';
import restoreSnakeCaseComponentNames from '../processor/transform/mdxish/restore-snake-case-component-name';
import {
  preserveBooleanProperties,
  restoreBooleanProperties,
} from '../processor/transform/mdxish/retain-boolean-attributes';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { magicBlock } from './micromark/magic-block';
import { loadComponents } from './utils/mdxish/mdxish-load-components';

export interface MdxishOpts {
  components?: CustomComponents;
  jsxContext?: JSXContext;
  useTailwind?: boolean;
}

const defaultTransformers = [calloutTransformer, codeTabsTransformer, gemojiTransformer, embedTransformer];

export function mdxishAstProcessor(mdContent: string, opts: MdxishOpts = {}) {
  const { components: userComponents = {}, jsxContext = {}, useTailwind } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Preprocessing pipeline: Transform content to be parser-ready
  // Step 1: Normalize malformed table separator syntax (e.g., `|: ---` → `| :---`)
  const contentAfterTableNormalization = normalizeTableSeparator(mdContent);
  // Step 2: Evaluate JSX expressions in attributes
  const contentAfterJSXEvaluation = preprocessJSXExpressions(contentAfterTableNormalization, jsxContext);
  // Step 3: Replace snake_case component names with parser-safe placeholders
  // (e.g., <Snake_case /> → <MDXishSnakeCase0 /> which will be restored after parsing)
  const { content: parserReadyContent, mapping: snakeCaseMapping } =
    processSnakeCaseComponent(contentAfterJSXEvaluation);

  // Create string map for tailwind transformer
  const tempComponentsMap = Object.entries(components).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  // Get mdxExpression extension and remove its flow construct to prevent
  // `{...}` from interrupting paragraphs (which breaks multiline magic blocks)
  const mdxExprExt = mdxExpression({ allowEmpty: true });
  const mdxExprTextOnly: Extension = {
    text: mdxExprExt.text,
  };

  const processor = unified()
    .data('micromarkExtensions', [magicBlock(), mdxExprTextOnly])
    .data('fromMarkdownExtensions', [magicBlockFromMarkdown(), mdxExpressionFromMarkdown()])
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(normalizeEmphasisAST)
    .use(magicBlockTransformer)
    .use(imageTransformer, { isMdxish: true })
    .use(defaultTransformers)
    .use(mdxishComponentBlocks)
    .use(restoreSnakeCaseComponentNames, { mapping: snakeCaseMapping })
    .use(mdxishTables)
    .use(mdxishHtmlBlocks)
    .use(evaluateExpressions, { context: jsxContext }) // Evaluate MDX expressions using jsxContext
    .use(variablesTextTransformer) // Parse {user.*} patterns from text (can't rely on remarkMdx)
    .use(useTailwind ? tailwindTransformer : undefined, { components: tempComponentsMap })
    .use(remarkGfm);

  return {
    processor,
    /**
     * @todo we need to return this transformed content for now
     * but ultimately need to properly tokenize our special markdown syntax
     * into hast nodes instead of relying on transformed content
     */
    parserReadyContent,
  };
}

/**
 * Converts an Mdast to a Markdown string.
 */
export function mdxishMdastToMd(mdast: MdastRoot) {
  const md = unified()
    .use(remarkGfm)
    .use(compilers)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
    })
    .stringify(mdast);
  return md;
}

/**
 * Processes markdown content with MDX syntax support and returns a HAST.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {} } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  const { processor, parserReadyContent } = mdxishAstProcessor(mdContent, opts);

  processor
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers })
    .use(preserveBooleanProperties) // RehypeRaw converts boolean properties to empty strings
    .use(rehypeRaw, { passThrough: ['html-block'] })
    .use(restoreBooleanProperties)
    .use(mdxishMermaidTransformer) // Add mermaid-render className to pre wrappers
    .use(rehypeSlug)
    .use(rehypeMdxishComponents, {
      components,
      processMarkdown: (markdown: string) => mdxish(markdown, opts),
    });

  const vfile = new VFile({ value: parserReadyContent });
  const hast = processor.runSync(processor.parse(parserReadyContent), vfile) as Root;

  if (!hast) {
    throw new Error('Markdown pipeline did not produce a HAST tree.');
  }

  return hast;
}

export default mdxish;
