import type { CustomComponents } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { Extension } from 'micromark-util-types';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkBreaks from 'remark-breaks';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { mdxishCompilers } from '../processor/compile';
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
import mdxishJsxToMdast from '../processor/transform/mdxish/mdxish-jsx-to-mdast';
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
import { terminateHtmlFlowBlocks } from '../processor/transform/mdxish/terminate-html-flow-blocks';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';

import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { variableFromMarkdown } from './mdast-util/variable';
import { magicBlock } from './micromark/magic-block';
import { variable } from './micromark/variable';
import { loadComponents } from './utils/mdxish/mdxish-load-components';

export interface MdxishOpts {
  components?: CustomComponents;
  jsxContext?: JSXContext;
  newEditorTypes?: boolean;
  /**
   * When enabled, the pipeline ignores all expression syntax `{...}`.
   * This disables:
   * - JSX attribute expression evaluation (e.g., `href={baseUrl}`)
   * - MDX expression parsing (e.g., `{1 + 1}`)
   * - Expression node evaluation
   *
   * Expressions will remain as literal text in the output.
   */
  safeMode?: boolean;
  useTailwind?: boolean;
}

const defaultTransformers = [calloutTransformer, codeTabsTransformer, gemojiTransformer, embedTransformer];

/**
 * Preprocessing pipeline: applies string-level transformations to work around
 * CommonMark/remark limitations and reach parity with legacy (rdmd) rendering.
 *
 * Runs a series of string-level transformations before micromark/remark parsing:
 * 1. Normalize malformed table separator syntax (e.g., `|: ---` → `| :---`)
 * 2. Terminate HTML flow blocks so subsequent content isn't swallowed
 * 3. Evaluate JSX expressions in attributes (unless safeMode)
 * 4. Replace snake_case component names with parser-safe placeholders
 */
function preprocessContent(
  content: string,
  opts: { jsxContext: JSXContext; knownComponents: Set<string>; safeMode: boolean },
) {
  const { safeMode, jsxContext, knownComponents } = opts;

  let result = normalizeTableSeparator(content);
  result = terminateHtmlFlowBlocks(result);
  result = safeMode ? result : preprocessJSXExpressions(result, jsxContext);

  return processSnakeCaseComponent(result, { knownComponents });
}

export function mdxishAstProcessor(mdContent: string, opts: MdxishOpts = {}) {
  const {
    components: userComponents = {},
    jsxContext = {},
    newEditorTypes = false,
    safeMode = false,
    useTailwind,
  } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Build set of known component names for snake_case filtering
  const knownComponents = new Set(Object.keys(components));

  const { content: parserReadyContent, mapping: snakeCaseMapping } = preprocessContent(mdContent, {
    safeMode,
    jsxContext,
    knownComponents,
  });

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
    .data('micromarkExtensions', safeMode ? [magicBlock(), variable()] : [magicBlock(), mdxExprTextOnly, variable()])
    .data(
      'fromMarkdownExtensions',
      safeMode
        ? [magicBlockFromMarkdown(), variableFromMarkdown()]
        : [magicBlockFromMarkdown(), mdxExpressionFromMarkdown(), variableFromMarkdown()],
    )
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
    .use(newEditorTypes ? mdxishJsxToMdast : undefined) // Convert JSX elements to MDAST types
    .use(safeMode ? undefined : evaluateExpressions, { context: jsxContext }) // Evaluate MDX expressions using jsxContext
    .use(variablesTextTransformer) // Parse {user.*} patterns from text
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
    .use(mdxishCompilers)
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
    .use(remarkBreaks)
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
