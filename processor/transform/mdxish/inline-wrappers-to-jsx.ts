import type { Node, Paragraph, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { phrasing } from 'mdast-util-phrasing';
import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS, INLINE_README_TYPES } from '../../../lib/constants';

import { isPascalCase } from './components/utils';
import { tableTags } from './tables/utils';

const isInlineComponentFlow = (node: Node): node is MdxJsxFlowElement =>
  node.type === 'mdxJsxFlowElement' && INLINE_COMPONENT_TAGS.has((node as MdxJsxFlowElement).name ?? '');

const isInline = (node: Node): boolean =>
  phrasing(node) ||
  node.type === 'html' ||
  INLINE_README_TYPES.has(node.type) ||
  (isInlineComponentFlow(node) && node.children.every(isInline));

/**
 * A lowercase wrapper whose body mdxish unwrapped from its sole paragraph (`<div>Read **b**</div>`).
 * Table parts are left to the `<Table>` writer, which spells its cells as flow elements.
 */
const isInlineWrapper = (node: Node): node is MdxJsxFlowElement => {
  if (node.type !== 'mdxJsxFlowElement') return false;
  const { name, children } = node as MdxJsxFlowElement;
  return (
    !!name &&
    !isPascalCase(name) &&
    name !== 'table' &&
    !tableTags.has(name) &&
    children.length > 0 &&
    children.every(isInline)
  );
};

const toTextElement = ({ name, attributes, children, position }: MdxJsxFlowElement): MdxJsxTextElement => ({
  type: 'mdxJsxTextElement',
  name,
  attributes,
  children: children.map(child =>
    isInlineComponentFlow(child) ? toTextElement(child) : child,
  ) as MdxJsxTextElement['children'],
  position,
});

/**
 * Serializes a lowercase wrapper holding only inline content on one line, as it was authored.
 * As a flow element each child would go out as its own block, so a save split the line.
 */
const mdxishInlineWrappersToJsx = (): Transform => tree => {
  visit(tree, isInlineWrapper, (node: MdxJsxFlowElement, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const paragraph: Paragraph = { type: 'paragraph', children: [toTextElement(node)], position: node.position };
    parent.children[index] = paragraph;
  });

  return tree;
};

export default mdxishInlineWrappersToJsx;
