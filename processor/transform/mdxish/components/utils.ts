import type { Html, PhrasingContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { emptyTaskListItemFromMarkdown } from '../../../../lib/mdast-util/empty-task-list-item';
import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { mdxComponentFromMarkdown } from '../../../../lib/mdast-util/mdx-component';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { mdxComponent } from '../../../../lib/micromark/mdx-component';

export type MdxAttributes = (MdxJsxAttribute | MdxJsxExpressionAttribute)[];

/**
 * Shared unified processor for re-parsing the body of an MDX-ish component.
 * Used by both the block and inline-block transformers so a nested component
 * (e.g. `<Anchor>text with <b>bold</b></Anchor>`) goes through the same
 * tokenizer chain as the top-level parse.
 */
export const inlineMdProcessor = unified()
  .data('micromarkExtensions', [mdxComponent(), legacyVariable()])
  .data('fromMarkdownExtensions', [mdxComponentFromMarkdown(), legacyVariableFromMarkdown(), emptyTaskListItemFromMarkdown()])
  .use(remarkParse)
  .use(remarkGfm);

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
