import type { CustomComponents, Variables } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { Extension } from 'micromark-util-types';
import type { PluggableList } from 'unified';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { mdxJsxToMarkdown } from 'mdast-util-mdx-jsx';

import { mdxishCompilers } from '../processor/compile';
import { rehypeFlattenTableCellParagraphs } from '../processor/plugin/flatten-table-cell-paragraphs';
import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import calloutTransformer from '../processor/transform/callouts';
import codeTabsTransformer from '../processor/transform/code-tabs';
import embedTransformer from '../processor/transform/embeds';
import imageTransformer from '../processor/transform/images';
import { closeSelfClosingHtmlTags } from '../processor/transform/mdxish/close-self-closing-html-tags';
import evaluateExpressions from '../processor/transform/mdxish/evaluate-expressions';
import generateSlugForHeadings from '../processor/transform/mdxish/heading-slugs';
import magicBlockTransformer from '../processor/transform/mdxish/magic-blocks/magic-block-transformer';
import mdxishComponentBlocks from '../processor/transform/mdxish/mdxish-component-blocks';
import mdxishHtmlBlocks from '../processor/transform/mdxish/mdxish-html-blocks';
import mdxishInlineComponents from '../processor/transform/mdxish/mdxish-inline-components';
import mdxishJsxToMdast from '../processor/transform/mdxish/mdxish-jsx-to-mdast';
import mdxishMermaidTransformer from '../processor/transform/mdxish/mdxish-mermaid';
import mdxishSelfClosingBlocks from '../processor/transform/mdxish/mdxish-self-closing-blocks';
import { processSnakeCaseComponent } from '../processor/transform/mdxish/mdxish-snake-case-components';
import mdxishTables from '../processor/transform/mdxish/mdxish-tables';
import mdxishTablesToJsx from '../processor/transform/mdxish/mdxish-tables-to-jsx';
import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import { normalizeTableSeparator } from '../processor/transform/mdxish/normalize-table-separator';
import {
  preprocessJSXExpressions,
  removeJSXComments,
  type JSXContext,
} from '../processor/transform/mdxish/preprocess-jsx-expressions';
import restoreSnakeCaseComponentNames from '../processor/transform/mdxish/restore-snake-case-component-name';
import {
  preserveBooleanProperties,
  restoreBooleanProperties,
} from '../processor/transform/mdxish/retain-boolean-attributes';
import { terminateHtmlFlowBlocks } from '../processor/transform/mdxish/terminate-html-flow-blocks';
import variablesCodeResolver from '../processor/transform/mdxish/variables-code';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';

import { emptyTaskListItemFromMarkdown } from './mdast-util/empty-task-list-item';
import { gemojiFromMarkdown } from './mdast-util/gemoji';
import { jsxCommentFromMarkdown } from './mdast-util/jsx-comment';
import { jsxTableFromMarkdown } from './mdast-util/jsx-table';
import { legacyVariableFromMarkdown } from './mdast-util/legacy-variable';
import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { gemoji } from './micromark/gemoji';
import { jsxComment } from './micromark/jsx-comment';
import { jsxTable } from './micromark/jsx-table';
import { legacyVariable } from './micromark/legacy-variable';
import { looseHtmlEntity, looseHtmlEntityFromMarkdown } from './micromark/loose-html-entities';
import { magicBlock } from './micromark/magic-block';
import { loadComponents } from './utils/mdxish/mdxish-load-components';
import { protectCodeBlocks, restoreCodeBlocks } from './utils/mdxish/protect-code-blocks';

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
  variables?: Variables;
}

const defaultTransformers: PluggableList = [
  [calloutTransformer, { isMdxish: true }],
  codeTabsTransformer,
  embedTransformer,
];

/**
 * Preprocessing pipeline: applies string-level transformations to work around
 * CommonMark/remark limitations and reach parity with legacy (rdmd) rendering.
 *
 * Runs a series of string-level transformations before micromark/remark parsing:
 * 1. Normalize malformed table separator syntax (e.g., `|: ---` → `| :---`)
 * 2. Terminate HTML flow blocks so subsequent content isn't swallowed
 * 3. Close invalid "self-closing" HTML tags (e.g., `<i />` → `<i></i>`)
 * 4. Evaluate JSX expressions in attributes (unless safeMode)
 * 5. Replace snake_case component names with parser-safe placeholders
 */
function preprocessContent(
  content: string,
  opts: { jsxContext: JSXContext; knownComponents: Set<string>; safeMode: boolean },
) {
  const { safeMode, jsxContext, knownComponents } = opts;

  let result = normalizeTableSeparator(content);
  result = terminateHtmlFlowBlocks(result);
  result = closeSelfClosingHtmlTags(result);
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

  const micromarkExts = [jsxTable(), magicBlock(), gemoji(), legacyVariable(), looseHtmlEntity()];
  const fromMarkdownExts = [
    jsxTableFromMarkdown(),
    magicBlockFromMarkdown(),
    gemojiFromMarkdown(),
    legacyVariableFromMarkdown(),
    emptyTaskListItemFromMarkdown(),
    looseHtmlEntityFromMarkdown(),
  ];

  if (!safeMode) {
    // Insert mdx expression (text-only, no flow) after gemoji at index 3
    micromarkExts.splice(3, 0, mdxExprTextOnly);
    fromMarkdownExts.splice(3, 0, mdxExpressionFromMarkdown());
  }

  if (!safeMode) {
    // JSX comment tokenizer must come before magicBlock so it claims `{/* ... */}` first
    micromarkExts.unshift(jsxComment());
    fromMarkdownExts.unshift(jsxCommentFromMarkdown());
  }

  const processor = unified()
    .data('micromarkExtensions', micromarkExts)
    .data('fromMarkdownExtensions', fromMarkdownExts)
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(normalizeEmphasisAST)
    .use(magicBlockTransformer)
    .use(imageTransformer, { isMdxish: true })
    .use(defaultTransformers)
    .use(mdxishSelfClosingBlocks)
    .use(mdxishComponentBlocks)
    .use(restoreSnakeCaseComponentNames, { mapping: snakeCaseMapping })
    .use(mdxishTables)
    .use(mdxishHtmlBlocks)
    .use(newEditorTypes ? mdxishInlineComponents : undefined) // Merge inline html components (e.g. <Anchor>) into MDAST nodes
    .use(newEditorTypes ? mdxishJsxToMdast : undefined) // Convert block JSX elements to MDAST types
    .use(variablesTextTransformer) // Parse {user.*} patterns from text nodes
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
 * Registers the mdx-jsx serialization extension so remark-stringify
 * can convert JSX nodes (e.g. `<Table>`) to markdown.
 */
function mdxJsxStringify(this: ReturnType<typeof unified>) {
  const data = this.data();
  const extensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
  extensions.push({ extensions: [mdxJsxToMarkdown()] });
}

/**
 * Serializes an Mdast back into a markdown string.
 */
export function mdxishMdastToMd(mdast: MdastRoot) {
  const processor = unified()
    .use(remarkGfm)
    .use(mdxishTablesToJsx)
    .use(mdxishCompilers)
    .use(mdxJsxStringify)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
    });
  return processor.stringify(processor.runSync(mdast));
}

/**
 * Processes markdown content with MDX syntax support and returns a HAST.
 * Detects and renders custom component tags from the components hash.
 *
 * @see {@link https://github.com/readmeio/rmdx/blob/main/docs/mdxish-flow.md}
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {}, jsxContext = {}, safeMode = false, variables } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Remove JSX comments before processing (protect code blocks first)
  const { protectedCode, protectedContent } = protectCodeBlocks(mdContent);
  const withoutComments = removeJSXComments(protectedContent);
  const contentWithoutComments = restoreCodeBlocks(withoutComments, protectedCode);

  const { processor, parserReadyContent } = mdxishAstProcessor(contentWithoutComments, opts);

  processor
    .use(safeMode ? undefined : evaluateExpressions, { context: jsxContext }) // Evaluate MDX expressions using jsxContext
    .use(remarkBreaks)
    .use(variablesCodeResolver, { variables }) // Resolve <<...>> and {user.*} inside code and inline code nodes
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers })
    .use(preserveBooleanProperties) // RehypeRaw converts boolean properties to empty strings
    .use(rehypeRaw, { passThrough: ['html-block'] })
    .use(restoreBooleanProperties)
    .use(rehypeFlattenTableCellParagraphs) // Remove <p> wrappers inside table cells to prevent margin issues
    .use(mdxishMermaidTransformer) // Add mermaid-render className to pre wrappers
    .use(generateSlugForHeadings)
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
