import type { Html, Node, PhrasingContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { htmlRawNames } from 'micromark-util-html-tag-name';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { NodeTypes } from '../../../../enums';
import { emptyTaskListItemFromMarkdown } from '../../../../lib/mdast-util/empty-task-list-item';
import { gemojiFromMarkdown } from '../../../../lib/mdast-util/gemoji';
import { jsxTableFromMarkdown } from '../../../../lib/mdast-util/jsx-table';
import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { magicBlockFromMarkdown } from '../../../../lib/mdast-util/magic-block';
import { mdxComponentFromMarkdown } from '../../../../lib/mdast-util/mdx-component';
import { gemoji } from '../../../../lib/micromark/gemoji';
import { jsxTable } from '../../../../lib/micromark/jsx-table';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { magicBlock } from '../../../../lib/micromark/magic-block';
import { mdxComponent } from '../../../../lib/micromark/mdx-component';
import { walkTags } from '../tables/tag-walker';
import { tableTags } from '../tables/utils';

export type MdxAttributes = (MdxJsxAttribute | MdxJsxExpressionAttribute)[];

const buildInlineMdProcessor = (safeMode: boolean) => {
  // `jsxTable` must be present so a `<Table>`/`<table>` nested in a component
  // body (e.g. a `<Callout>`) is captured as one html node. Without it, blank
  // lines between rows let CommonMark HTML block type 6 fragment the table and
  // its rows spill out as text / indented code blocks (CX-3705).
  const micromarkExts = [jsxTable(), mdxComponent(), gemoji(), legacyVariable(), magicBlock()];
  const fromMarkdownExts = [
    jsxTableFromMarkdown(),
    mdxComponentFromMarkdown(),
    gemojiFromMarkdown(),
    legacyVariableFromMarkdown(),
    emptyTaskListItemFromMarkdown(),
    magicBlockFromMarkdown(),
  ];

  // Since evaluating expressions can be dangerous, do so only when safeMode is off
  if (!safeMode) {
    const mdxExprExt = mdxExpression({ allowEmpty: true });
    // We include both flow and text extensions to support both single-line and multi-line expressions
    micromarkExts.push({ flow: mdxExprExt.flow, text: mdxExprExt.text });
    fromMarkdownExts.push(mdxExpressionFromMarkdown());
  }

  return unified()
    .data('micromarkExtensions', micromarkExts)
    .data('fromMarkdownExtensions', fromMarkdownExts)
    .use(remarkParse)
    .use(remarkGfm);
};

const processorCache = new Map<boolean, ReturnType<typeof buildInlineMdProcessor>>();

/**
 * Unified processor for re-parsing the body of an MDX component
 * Memoized based on the argument value so we don't pay the construction cost on every parse
 * Currently the argument is only safeMode, but we could add more arguments in the future,
 * in which case the key would need to be extend to include the new arguments.
 */
export const getInlineMdProcessor = ({ safeMode = false }: { safeMode?: boolean } = {}) => {
  let processor = processorCache.get(safeMode);
  if (!processor) {
    processor = buildInlineMdProcessor(safeMode);
    processorCache.set(safeMode, processor);
  }
  return processor;
};

/**
 * True when a tag name starts with an uppercase letter — ReadMe's marker for
 * a custom MDX component (vs a lowercase HTML tag).
 */
export const isPascalCase = (tag: string): boolean => /^[A-Z]/.test(tag);

/**
 * True when the attribute list contains at least one JSX expression value
 * (e.g. `href={url}`). The `mdxComponent` tokenizer only claims lowercase
 * tags when they carry one of these; both block transformers use the same
 * signal to decide eligibility.
 */
export const hasExpressionAttr = (attributes: MdxAttributes): boolean =>
  attributes.some(
    attr => attr.type === 'mdxJsxAttribute' && typeof attr.value === 'object' && attr.value !== null,
  );

/**
 * Factory for the `mdxJsxTextElement` node shape. `position` is optional
 * because the two call sites differ: the tokenized-tag path carries the
 * original html node's position forward, while the sibling-merge path
 * composes children from pre-existing nodes with no outer position.
 */
export const toMdxJsxTextElement = (
  name: string,
  attributes: MdxAttributes,
  children: PhrasingContent[],
  position?: Html['position'],
): MdxJsxTextElement => ({
  type: 'mdxJsxTextElement',
  name,
  attributes,
  children,
  ...(position ? { position } : {}),
});

// Raw-body tags (pre/script/style/textarea) must stay byte-exact; table
// structure (`table` + `tableTags`) is owned by `mdxishTables` and figures by
// `mdxishJsxToMdast`, both of which run later on raw html nodes.
const NON_PROMOTABLE_PLAIN_TAGS = new Set<string>([...htmlRawNames, ...tableTags, 'table', 'figure', 'figcaption']);
export const NESTED_TABLE_RE = /<table[\s>]/i;
export const isMarkdownPromotableHtmlTag = (tag: string): boolean => !NON_PROMOTABLE_PLAIN_TAGS.has(tag);

// Expression nodes count as plain so `<div>{1+1}</div>` keeps its current
// literal-brace behavior; variables/glossary already resolve inside raw html.
const PLAIN_CONTENT_TYPES = new Set<string>([
  'paragraph',
  'text',
  'html',
  'mdxTextExpression',
  'mdxFlowExpression',
  NodeTypes.variable,
  NodeTypes.glossary,
]);

// Promoting plain HTML is only worth bypassing rehype-raw's parse5 pass when
// the body parses into an actual markdown construct.
export const containsMarkdownConstruct = (nodes: Node[]): boolean =>
  nodes.some(
    node =>
      !PLAIN_CONTENT_TYPES.has(node.type) ||
      ('children' in node && Array.isArray(node.children) && containsMarkdownConstruct(node.children)),
  );

/**
 * Index of the `</tag>` that balances the already-consumed opening tag (the
 * caller starts us one level deep). `lastIndexOf` mis-slices sibling same-tag
 * pairs like `<div>**a**</div><div>**b**</div>`, so we depth-match instead —
 * delegating to `walkTags` (htmlparser2) so quoted attributes (`title="</div>"`),
 * code spans, and legacy `<<VARIABLE>>` are handled for free. Returns -1 when
 * the wrapper is left open.
 */
export function findBalancedClosingTagIndex(content: string, tag: string): number {
  const target = tag.toLowerCase();
  const canonicalCloserLength = tag.length + 3; // `</tag>`
  // The caller already stripped the opening tag, so re-attach one: htmlparser2
  // drops an unmatched closer, and we want it balanced. Offsets shift by the
  // prefix length.
  const prefix = `<${tag}>`;
  let depth = 0;
  let closeIndex = -1;
  walkTags(prefix + content, {
    onOpen: ({ name, isSelfClosing, isStrayCloser }) => {
      if (closeIndex >= 0 || isSelfClosing || isStrayCloser) return;
      if (name.toLowerCase() === target) depth += 1;
    },
    onClose: ({ name, start, end, implicit }) => {
      if (closeIndex >= 0 || implicit || name.toLowerCase() !== target) return;
      // Only canonical `</tag>` closers — the caller slices by that length, so a
      // whitespaced `</tag >` would misalign; leaving it unmatched keeps it raw.
      if (end - start !== canonicalCloserLength) return;
      depth -= 1;
      if (depth === 0) closeIndex = start - prefix.length;
    },
  });
  return closeIndex;
}
