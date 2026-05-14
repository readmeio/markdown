import type { CustomComponents } from '../../../types';
import type { Html, Node, Parent, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { visit } from 'unist-util-visit';

import { getComponentName } from '../../../lib/utils/mdxish/mdxish-get-component-name';
import { RUNTIME_COMPONENT_TAGS, STANDARD_HTML_TAGS } from '../../../utils/common-html-words';

interface Options {
  components: CustomComponents;
}

const LEADING_TAG_REGEX = /^<\/?([A-Za-z][A-Za-z0-9]*)\b/;

function isUnresolvedPascalCase(tagName: string, components: CustomComponents): boolean {
  if (!/^[A-Z]/.test(tagName)) return false;
  if (STANDARD_HTML_TAGS.has(tagName.toLowerCase())) return false;
  if (RUNTIME_COMPONENT_TAGS.has(tagName)) return false;
  return !getComponentName(tagName, components);
}

/**
 * A user typing `<Version>` (a PascalCase tag that resembles a JSX component
 * but isn't registered) parses to either a raw `html` MDAST node or an
 * `mdxJsx{Flow,Text}Element`. Downstream, parse5 opens a `<version>` element
 * and `rehypeMdxishComponents` removes it along with every sibling that got
 * slurped in as its children — silently dropping page content.
 *
 * Demote unresolved PascalCase tags to plain text so they round-trip as
 * literal `<Tag>` characters instead of vanishing. Lowercase HTML tags and
 * registered components are left untouched.
 */
const demoteUnresolvedJsxTags: Plugin<[Options], Root> = ({ components }) => (tree, file) => {
  const source = (file as VFile)?.toString?.() ?? '';

  visit(tree, 'html', (node: Html) => {
    const match = LEADING_TAG_REGEX.exec(node.value);
    if (!match) return;
    if (!isUnresolvedPascalCase(match[1], components)) return;

    (node as unknown as { type: string; value: string }).type = 'text';
  });

  visit(tree, (node: Node, index, parent) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
    if (!parent || index === undefined) return;

    const jsxNode = node as MdxJsxFlowElement | MdxJsxTextElement;
    if (!jsxNode.name || !isUnresolvedPascalCase(jsxNode.name, components)) return;

    const startOffset = jsxNode.position?.start?.offset;
    const endOffset = jsxNode.position?.end?.offset;
    const original = startOffset !== undefined && endOffset !== undefined
      ? source.slice(startOffset, endOffset)
      : `<${jsxNode.name}>`;

    (parent as Parent).children[index] = {
      type: 'text',
      value: original,
      position: jsxNode.position,
    } as unknown as Parent['children'][number];
  });
};

export default demoteUnresolvedJsxTags;
