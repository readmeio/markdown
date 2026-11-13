import type { Html, Node, PhrasingContent } from 'mdast';
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'mdast-util-mdx-jsx';

import { mdxFromMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';
import { htmlRawNames } from 'micromark-util-html-tag-name';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { FEATURES, mdxishExtensions } from '../../../../lib/micromark/mdxish-extensions';
import { NON_REPARSED_BODY_TAGS } from '../../../../utils/common-html-words';
import { walkTags } from '../tables/tag-walker';
import { tableTags } from '../tables/utils';
import { soleUserVariableExpression } from '../variables-text';

export type MdxAttributes = (MdxJsxAttribute | MdxJsxExpressionAttribute)[];

const buildComponentBoundaryProcessor = () => {
  const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.componentBoundary);
  // `mdxjs` goes first (= lowest priority) so `legacyVariable` wins `<` and `<<var>>` doesn't throw.
  return unified()
    .data('micromarkExtensions', [mdxjs(), ...micromarkExtensions])
    .data('fromMarkdownExtensions', [mdxFromMarkdown(), ...fromMarkdownExtensions])
    .use(remarkParse);
};
const componentBoundaryProcessor = buildComponentBoundaryProcessor();

/** Find top-level JSX siblings without changing MDXish's recovery for non-JSX bodies. */
export function findComponentSiblingSpans(content: string, tag: string): { end: number; start: number }[] {
  const closingTag = `</${tag}>`;
  if (content.indexOf(closingTag) === content.lastIndexOf(closingTag)) return [];
  const prefix = `<${tag}>`;
  try {
    const tree = componentBoundaryProcessor.parse(prefix + content);
    const children = tree.children.flatMap(node =>
      node.type === 'paragraph' && 'children' in node ? node.children : [node],
    );
    const components = children.filter(
      (node): node is MdxJsxFlowElement | MdxJsxTextElement =>
        node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement',
    );
    if (components.length < 2 || components[0].name !== tag || components[0].position?.start.offset !== 0) return [];
    return components.map(node => ({
      start: node.position.start.offset - prefix.length,
      end: node.position.end.offset - prefix.length,
    }));
  } catch {
    // MDXish accepts non-JSX syntax; preserve its existing closing-tag recovery.
    return [];
  }
}

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
  attributes.some(attr => attr.type === 'mdxJsxAttribute' && typeof attr.value === 'object' && attr.value !== null);

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
const NON_PROMOTABLE_PLAIN_TAGS = new Set<string>([...htmlRawNames, ...tableTags, 'table', ...NON_REPARSED_BODY_TAGS]);
export const NESTED_TABLE_RE = /<table[\s>]/i;
export const isMarkdownPromotableHtmlTag = (tag: string): boolean => !NON_PROMOTABLE_PLAIN_TAGS.has(tag);

// Expression nodes count as plain so `<div>{1+1}</div>` keeps its current
// literal-brace behavior — authors put CSS-shaped braces in these bodies, and only
// a reference that names a real variable may resolve.
const PLAIN_CONTENT_TYPES = new Set<string>(['paragraph', 'text', 'html', 'mdxTextExpression', 'mdxFlowExpression']);

// Promoting plain HTML is only worth bypassing rehype-raw's parse5 pass when
// the body parses into an actual markdown construct. Variables and glossary terms
// count: parse5 renders `<<var>>` as a stray `<` plus a `<var>` tag, so a body that
// holds nothing else still has to be promoted to resolve.
export const containsMarkdownConstruct = (nodes: Node[]): boolean =>
  nodes.some(
    node =>
      !PLAIN_CONTENT_TYPES.has(node.type) ||
      soleUserVariableExpression(node) !== null ||
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
