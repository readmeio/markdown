import type { Html, PhrasingContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { emptyTaskListItemFromMarkdown } from '../../../../lib/mdast-util/empty-task-list-item';
import { gemojiFromMarkdown } from '../../../../lib/mdast-util/gemoji';
import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { magicBlockFromMarkdown } from '../../../../lib/mdast-util/magic-block';
import { mdxComponentFromMarkdown } from '../../../../lib/mdast-util/mdx-component';
import { gemoji } from '../../../../lib/micromark/gemoji';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { magicBlock } from '../../../../lib/micromark/magic-block';
import { mdxComponent } from '../../../../lib/micromark/mdx-component';

export type MdxAttributes = (MdxJsxAttribute | MdxJsxExpressionAttribute)[];

/**
 * Parse-only processor for re-parsing the body of an MDX-ish component.
 * Tokenizer extensions match the top-level parse so a nested component
 * (e.g. `<Anchor>text with <b>bold</b></Anchor>`) goes through the same
 * chain. `mdxExpression` is included only when not in safeMode, mirroring
 * the top-level parser's safeMode contract.
 */
export const getInlineMdProcessor = ({ safeMode = false }: { safeMode?: boolean } = {}) => {
  const micromarkExts = [mdxComponent(), gemoji(), legacyVariable(), magicBlock()];
  const fromMarkdownExts = [
    mdxComponentFromMarkdown(),
    gemojiFromMarkdown(),
    legacyVariableFromMarkdown(),
    emptyTaskListItemFromMarkdown(),
    magicBlockFromMarkdown(),
  ];

  if (!safeMode) {
    // Text-only mdx expression so `{1 + 1}` etc. inside a component body
    // produce expression nodes that `evaluateExpressions` can later resolve,
    // rather than falling through as literal text. Flow form is omitted on
    // purpose to match the top-level parser, where `{...}` must not
    // interrupt paragraphs (would break multiline magic blocks).
    const mdxExprExt = mdxExpression({ allowEmpty: true });
    micromarkExts.push({ text: mdxExprExt.text });
    fromMarkdownExts.push(mdxExpressionFromMarkdown());
  }

  return unified()
    .data('micromarkExtensions', micromarkExts)
    .data('fromMarkdownExtensions', fromMarkdownExts)
    .use(remarkParse)
    .use(remarkGfm);
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
