import type { CustomComponents, Variables } from '../types';
import type { Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { Extension } from 'micromark-util-types';
import type { PluggableList } from 'unified';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxJsxToMarkdown } from 'mdast-util-mdx-jsx';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';
import rehypeRaw from 'rehype-raw';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { mdxishCompilers } from '../processor/compile';
import { rehypeFlattenTableCellParagraphs } from '../processor/plugin/flatten-table-cell-paragraphs';
import hardBreaks from '../processor/plugin/hard-breaks';
import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import calloutTransformer from '../processor/transform/callouts';
import codeTabsTransformer from '../processor/transform/code-tabs';
import embedTransformer from '../processor/transform/embeds';
import imageTransformer from '../processor/transform/images';
import mdxishCalloutToJsx from '../processor/transform/mdxish/callout-to-jsx';
import { closeSelfClosingHtmlTags } from '../processor/transform/mdxish/close-self-closing-html-tags';
import { collapseForeignContentBlankLines } from '../processor/transform/mdxish/collapse-foreign-content-blank-lines';
import mdxishInlineMdxHtmlBlocks from '../processor/transform/mdxish/components/inline-html';
import mdxishInlineMdxComponents from '../processor/transform/mdxish/components/inline-mdx-blocks';
import mdxishMdxComponentBlocks from '../processor/transform/mdxish/components/mdx-blocks';
import mdxishSelfClosingBlocks from '../processor/transform/mdxish/components/self-closing-blocks';
import { processSnakeCaseComponent } from '../processor/transform/mdxish/components/snake-case-components';
import evaluateExports from '../processor/transform/mdxish/evaluate-exports';
import evaluateExpressions from '../processor/transform/mdxish/evaluate-expressions';
import evaluateStyleBlockExpressions from '../processor/transform/mdxish/evaluate-style-block-expressions';
import generateSlugForHeadings from '../processor/transform/mdxish/heading-slugs';
import magicBlockTransformer from '../processor/transform/mdxish/magic-blocks/magic-block-transformer';
import mdxishHtmlBlocks from '../processor/transform/mdxish/mdxish-html-blocks';
import mdxishJsxToMdast from '../processor/transform/mdxish/mdxish-jsx-to-mdast';
import mdxishMermaidTransformer from '../processor/transform/mdxish/mdxish-mermaid';
import { normalizeClosingTagWhitespace } from '../processor/transform/mdxish/normalize-closing-tag-whitespace';
import { normalizeCompactHeadings } from '../processor/transform/mdxish/normalize-compact-headings';
import normalizeEmphasisAST from '../processor/transform/mdxish/normalize-malformed-md-syntax';
import normalizeMdxJsxNodes from '../processor/transform/mdxish/normalize-mdx-jsx-nodes';
import { removeJSXComments } from '../processor/transform/mdxish/remove-jsx-comments';
import resolveDeferredAttributeExpressionProps from '../processor/transform/mdxish/resolve-deferred-attribute-expression-props';
import restoreSnakeCaseComponentNames from '../processor/transform/mdxish/restore-snake-case-component-name';
import {
  preserveBooleanProperties,
  restoreBooleanProperties,
} from '../processor/transform/mdxish/retain-boolean-attributes';
import mdxishTables from '../processor/transform/mdxish/tables/mdxish-tables';
import mdxishTablesToJsx from '../processor/transform/mdxish/tables/mdxish-tables-to-jsx';
import { normalizeTableSeparator } from '../processor/transform/mdxish/tables/normalize-table-separator';
import { terminateHtmlFlowBlocks } from '../processor/transform/mdxish/terminate-html-flow-blocks';
import variablesCodeResolver from '../processor/transform/mdxish/variables-code';
import variablesTextTransformer from '../processor/transform/mdxish/variables-text';
import tailwindTransformer from '../processor/transform/tailwind';
import { jsxAcornParser } from '../processor/utils';

import { emptyTaskListItemFromMarkdown } from './mdast-util/empty-task-list-item';
import { gemojiFromMarkdown } from './mdast-util/gemoji';
import { htmlBlockComponentFromMarkdown } from './mdast-util/html-block-component';
import { jsxTableFromMarkdown } from './mdast-util/jsx-table';
import { legacyVariableFromMarkdown } from './mdast-util/legacy-variable';
import { magicBlockFromMarkdown } from './mdast-util/magic-block';
import { mdxComponentFromMarkdown } from './mdast-util/mdx-component';
import { gemoji } from './micromark/gemoji';
import { htmlBlockComponent } from './micromark/html-block-component';
import { jsxComment } from './micromark/jsx-comment';
import { jsxTable } from './micromark/jsx-table';
import { legacyVariable } from './micromark/legacy-variable';
import { looseHtmlEntity, looseHtmlEntityFromMarkdown } from './micromark/loose-html-entities';
import { magicBlock } from './micromark/magic-block';
import { mdxComponent } from './micromark/mdx-component';
import { mdxExpressionLenient } from './micromark/mdx-expression-lenient';
import { loadComponents } from './utils/mdxish/mdxish-load-components';
import { protectCodeBlocks, restoreCodeBlocks } from './utils/mdxish/protect-code-blocks';

export interface MdxishOpts {
  components?: CustomComponents;
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
 * 1. Canonicalize closing tags with stray whitespace (e.g., `</ td >` → `</td>`)
 * 2. Normalize malformed table separator syntax (e.g., `|: ---` → `| :---`)
 * 3. Collapse blank lines inside `<svg>`/`<math>` so their children aren't fragmented
 * 4. Terminate HTML flow blocks so subsequent content isn't swallowed
 * 5. Close invalid "self-closing" HTML tags (e.g., `<i />` → `<i></i>`)
 * 6. Normalize compact ATX headings (e.g., `#Heading` → `# Heading`)
 * 7. Replace snake_case component names with parser-safe placeholders
 */
function preprocessContent(
  content: string,
  opts: { knownComponents: Set<string> },
) {
  const { knownComponents } = opts;

  // Runs first so `jsxTable` sees a literal `</table>` (and the HTML-line
  // classification in `terminateHtmlFlowBlocks` is accurate)
  let result = normalizeClosingTagWhitespace(content);
  result = normalizeTableSeparator(result);
  // Before terminateHtmlFlowBlocks: a blank line inside an <svg>/<math> island
  // would otherwise fragment it (children spill out as an indented code block once
  // a wrapper re-parses its deindented body — #1545).
  result = collapseForeignContentBlankLines(result);
  result = terminateHtmlFlowBlocks(result);
  result = closeSelfClosingHtmlTags(result);
  result = normalizeCompactHeadings(result);

  return processSnakeCaseComponent(result, { knownComponents });
}

export function mdxishAstProcessor(mdContent: string, opts: MdxishOpts = {}) {
  const {
    components: userComponents = {},
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

  const { content: parserReadyContent, mapping: snakeCaseMapping } = preprocessContent(mdContent, { knownComponents });

  // Create string map for tailwind transformer
  const tempComponentsMap = Object.entries(components).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  // Parser extension for MDX expressions {}
  const mdxExprTextOnly: Extension = mdxExpressionLenient();

  const micromarkExts = [
    jsxTable(),
    magicBlock(),
    mdxComponent(),
    gemoji(),
    legacyVariable(),
    looseHtmlEntity(),
    htmlBlockComponent(),
  ];
  const fromMarkdownExts = [
    jsxTableFromMarkdown(),
    magicBlockFromMarkdown(),
    mdxComponentFromMarkdown(),
    gemojiFromMarkdown(),
    legacyVariableFromMarkdown(),
    emptyTaskListItemFromMarkdown(),
    looseHtmlEntityFromMarkdown(),
    htmlBlockComponentFromMarkdown(),
  ];

  if (!safeMode) {
    // Insert mdx expression (text-only, no flow) after gemoji at index 3
    micromarkExts.splice(3, 0, mdxExprTextOnly);
    fromMarkdownExts.splice(3, 0, mdxExpressionFromMarkdown());

    // Tokenizer for MDX variable declarations
    micromarkExts.push(mdxjsEsm({ acorn: jsxAcornParser, addResult: true }));
    fromMarkdownExts.push(mdxjsEsmFromMarkdown());
  }

  if (!safeMode) {
    // JSX comment tokenizer must come before magicBlock so it claims `{/* ... */}` first
    micromarkExts.unshift(jsxComment());
  }

  // Claim `<HTMLBlock>` as one opaque token so broad tokenizers can't fragment its body
  // We put this last as micromark tries the last-registered extension first, so push (not unshift) to win the `<` race.
  // micromarkExts.push(htmlBlockComponent());
  // fromMarkdownExts.push(htmlBlockComponentFromMarkdown());

  const processor = unified()
    .data('micromarkExtensions', micromarkExts)
    .data('fromMarkdownExtensions', fromMarkdownExts)
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(normalizeEmphasisAST)
    .use(mdxishSelfClosingBlocks)
    .use(mdxishMdxComponentBlocks, { safeMode })
    .use(mdxishInlineMdxHtmlBlocks, { safeMode })
    .use(restoreSnakeCaseComponentNames, { mapping: snakeCaseMapping })
    .use(mdxishTables)
    .use(mdxishHtmlBlocks) // Convert every <HTMLBlock> shape → html-block
    // The next few transformers must appear after mdxishMdxComponentBlocks
    // so nodes produced by the inline re-parse of component bodies
    // (e.g. code/image/embed inside <Tabs>) get visited too
    .use(magicBlockTransformer)
    .use(imageTransformer, { isMdxish: true })
    .use(defaultTransformers)
    .use(newEditorTypes ? mdxishInlineMdxComponents : undefined) // Merge inline html components (e.g. <Anchor>) into MDAST nodes
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
    .use(mdxishCalloutToJsx)
    .use(mdxishTablesToJsx)
    .use(mdxishCompilers)
    .use(mdxJsxStringify)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
      // Escape literal braces in text so they don't parse as (often
      // unterminated) MDX expressions on the next round trip.
      unsafe: [
        { character: '{', inConstruct: 'phrasing' },
        { character: '}', inConstruct: 'phrasing' },
      ],
    });
  return processor.stringify(processor.runSync(mdast));
}

/**
 * Processes markdown content with MDX syntax support and returns a HAST.
 * Detects and renders custom component tags from the components hash.
 *
 * @see .claude/context/MDXish/Processor Overview.md
 */
export function mdxish(mdContent: string, opts: MdxishOpts = {}): Root {
  const { components: userComponents = {}, safeMode = false, variables } = opts;

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
    .use(safeMode ? undefined : evaluateExports) // Evaluate `export const/function` and stash scope on file.data.mdxishScope
    .use(hardBreaks) // Must precede evaluateExpressions to avoid splitting the \n in an evaluated template literal into a <br> node
    .use(safeMode ? undefined : evaluateExpressions) // Evaluate self-contained MDX expressions (e.g. `{1+1}`)
    .use(safeMode ? undefined : evaluateStyleBlockExpressions) // Evaluate `<style>{`...`}</style>` template literals into plain CSS
    .use(variablesCodeResolver, { variables }) // Resolve <<...>> and {user.*} inside code and inline code nodes
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers })
    .use(preserveBooleanProperties) // RehypeRaw converts boolean properties to empty strings
    .use(rehypeRaw, { passThrough: ['html-block', 'mdx-jsx'] }) // MDX JSX nodes bypass parse5's string-only HTML round-trip
    .use(restoreBooleanProperties)
    .use(safeMode ? undefined : resolveDeferredAttributeExpressionProps) // Evaluate deferred attribute expressions on mdx-jsx nodes (now past rehypeRaw's clone)
    .use(normalizeMdxJsxNodes) // Rewrite `mdx-jsx` back to standard `element` nodes for downstream plugins
    .use(rehypeFlattenTableCellParagraphs) // Remove <p> wrappers inside table cells to prevent margin issues
    .use(mdxishMermaidTransformer) // Add mermaid-render className to pre wrappers
    .use(generateSlugForHeadings)
    .use(rehypeMdxishComponents, {
      components,
      processMarkdown: (markdown: string) => mdxish(markdown, opts),
    });

  const vfile = new VFile({ value: parserReadyContent });
  const mdast = processor.parse(parserReadyContent);
  const hast = processor.runSync(mdast, vfile) as Root;

  if (!hast) {
    throw new Error('Markdown pipeline did not produce a HAST tree.');
  }

  // Stash the in-document exported components on the tree
  // so that the renderer consumer knows & renders them.
  // Required for exported components to get rendered.
  if (vfile.data.mdxishScope) {
    hast.data = { ...hast.data, mdxishScope: vfile.data.mdxishScope };
  }

  return hast;
}

export default mdxish;
