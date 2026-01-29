import type { CustomComponents } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';

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
import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import mdxishHtmlBlocks from '../processor/transform/mdxish/mdxish-html-blocks';
import magicBlockRestorer from '../processor/transform/mdxish/mdxish-magic-blocks';
import mdxishMermaidTransformer from '../processor/transform/mdxish/mdxish-mermaid';
import { processSnakeCaseComponent } from '../processor/transform/mdxish/mdxish-snake-case-components';
import mdxishTables from '../processor/transform/mdxish/mdxish-tables';
import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { normalizeTableSeparator } from '../processor/transform/mdxish/normalize-table-separator';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/mdxish/preprocess-jsx-expressions';
import restoreSnakeCaseComponentNames from '../processor/transform/mdxish/restore-snake-case-component-name';
import { preserveBooleanProperties, restoreBooleanProperties } from '../processor/transform/mdxish/retain-boolean-attributes';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';

import { extractMagicBlocks } from './utils/extractMagicBlocks';
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

  // Build set of known component names for snake_case filtering
  const knownComponents = new Set(Object.keys(components));

  // Preprocessing pipeline: Transform content to be parser-ready
  // Step 1: Extract legacy magic blocks
  const { replaced: contentAfterMagicBlocks, blocks } = extractMagicBlocks(mdContent);
  // Step 2: Normalize malformed table separator syntax (e.g., `|: ---` → `| :---`)
  const contentAfterTableNormalization = normalizeTableSeparator(contentAfterMagicBlocks);
  // Step 3: Evaluate JSX expressions in attributes
  const contentAfterJSXEvaluation = preprocessJSXExpressions(contentAfterTableNormalization, jsxContext);
  // Step 4: Replace snake_case component names with parser-safe placeholders
  const { content: parserReadyContent, mapping: snakeCaseMapping } = processSnakeCaseComponent(
    contentAfterJSXEvaluation,
    { knownComponents }
  );

  // Create string map for tailwind transformer
  const tempComponentsMap = Object.entries(components).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  const processor = unified()
    .data('micromarkExtensions', [mdxExpression({ allowEmpty: true })]) // Parse inline JSX expressions as AST nodes for later evaluation
    .data('fromMarkdownExtensions', [mdxExpressionFromMarkdown()])
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(normalizeEmphasisAST)
    .use(magicBlockRestorer, { blocks })
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
  const md = unified().use(remarkGfm).use(compilers).use(remarkStringify, {
    bullet: '-',
    emphasis: '_',
  }).stringify(mdast);
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
