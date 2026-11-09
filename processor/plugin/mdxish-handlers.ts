import type { HTMLBlock, MdxJsx } from '../../types';
import type { Properties } from 'hast';
import type { ListItem } from 'mdast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

import { decodeHTMLStrict } from 'entities/decode';
import { defaultHandlers } from 'remark-rehype';

import { NodeTypes } from '../../enums';

const HTML_COMMENT_REGEX = /^<!--[\s\S]*-->$/;

// If hChildren is populated, it means the node holds a renderable value (e.g. React)
// See evaluate-expressions.ts for more details
// Otherwise, it's a simple value and we fall back to text
const mdxExpressionHandler: Handler = (_state, node) =>
  node.data?.hChildren ?? { type: 'text', value: (node as { value?: string }).value || '' };

// Convert MDX JSX elements to a custom mdx-jsx hast node that bypasses rehypeRaw's
// HTML serialization round-trip; downstream normalization rewrites it to `element`.
const mdxJsxElementHandler: Handler = (state, node) => {
  const { attributes = [], name } = node as { attributes?: MdxJsxAttribute[]; name?: string };
  const properties: Record<string, unknown> = {};
  const deferredExpressions: Record<string, string> = {};

  attributes.forEach(attribute => {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) return;

    if (attribute.value === null) {
      properties[attribute.name] = true;
    } else if (typeof attribute.value === 'string') {
      properties[attribute.name] = decodeHTMLStrict(attribute.value);
    } else {
      // Defer every attribute-expression evaluation past rehypeRaw's `structuredClone`
      // passthrough: evaluating here can yield React elements or functions that the clone
      // rejects. The source is stashed in `node.data` (clone-safe) and
      // `resolveDeferredAttributeExpressionProps` evaluates it once past the clone.
      deferredExpressions[attribute.name] = (attribute.value as MdxJsxAttributeValueExpression).value;
    }
  });

  const hasDeferredExpressions = Object.keys(deferredExpressions).length > 0;
  const jsxNode: MdxJsx = {
    type: 'mdx-jsx',
    tagName: name || '',
    properties: properties as Properties,
    children: state.all(node),
    ...(hasDeferredExpressions && { data: { deferredExpressions } }),
  };
  return jsxNode;
};

// Convert html-block MDAST nodes to HAST elements, preserving hProperties
const htmlBlockHandler: Handler = (_state, node) => {
  const htmlBlockNode = node as HTMLBlock;
  const hProperties = htmlBlockNode.data?.hProperties || {};

  return {
    type: 'element',
    tagName: 'html-block',
    properties: hProperties as Properties,
    children: [],
  };
};

// Convert embed magic blocks to Embed components
const embedHandler: Handler = (state, node) => {
  // Assert to get the minimum properties we need
  const { data } = node as { data?: { hName?: string; hProperties?: Properties } };

  // Magic block embeds (hName === 'embed-block') render as Embed component
  // which doesn't use children - it renders based on props only
  const isMagicBlockEmbed = data?.hName === NodeTypes.embedBlock;

  return {
    type: 'element',
    // To differentiate between regular embeds and magic block embeds,
    // magic block embeds have a certain hName
    tagName: isMagicBlockEmbed ? 'Embed' : 'embed',
    properties: data?.hProperties,
    // Don't include children for magic block embeds - Embed component renders based on props
    children: isMagicBlockEmbed ? [] : state.all(node),
  };
};

/**
 * Whether a list item child renders as a block that needs space above it.
 *
 * Takes a child other than a paragraph or a sublist and returns false for nodes that render
 * nothing visible: link and footnote definitions, and HTML comments.
 */
const rendersBlock = (child: ListItem['children'][number]) => {
  switch (child.type) {
    case 'definition':
    case 'footnoteDefinition':
      return false;
    case 'html':
      return !HTML_COMMENT_REGEX.test(child.value.trim());
    default:
      return true;
  }
};

/**
 * Renders a list item whose marker sits alone on its line with that line kept empty.
 *
 * `-` over an indented block (a sublist, a code block) parses to the same mdast as the
 * block written on the marker's line, since CommonMark has no empty paragraph, so both
 * would render as `- - B`. Positions still tell the spellings apart. A `<br>` holds the
 * line open, which an empty `<p>` wouldn't.
 */
const listItemHandler: Handler = (state, node, parent) => {
  const item = node as ListItem;
  // A tight item unwraps its text from `<p>`, so a block after it (a callout, a code block)
  // loses the paragraph margin that spaces it. Wrap the text like the editor does, which always
  // keeps it in a paragraph, see `ListItem` in
  // readmeio/readme: packages/react/src/ui/MdxishEditor/extensions/document/List/index.ts
  const hasTextAndBlock =
    item.children.some(child => child.type === 'paragraph') &&
    item.children.some(child => child.type !== 'paragraph' && child.type !== 'list' && rendersBlock(child));
  const result = defaultHandlers.listItem(
    state,
    item,
    hasTextAndBlock && parent?.type === 'list' ? { ...parent, spread: true } : parent,
  );
  const first = item.children[0];
  if (!first || first.type === 'paragraph') return result;

  const itemLine = item.position?.start.line;
  const blockLine = first.position?.start.line;
  if (itemLine === undefined || blockLine === undefined || blockLine <= itemLine) return result;

  result.children.unshift({ type: 'element', tagName: 'br', properties: {}, children: [] });
  return result;
};

export const mdxComponentHandlers: Handlers = {
  embed: embedHandler,
  listItem: listItemHandler,
  mdxFlowExpression: mdxExpressionHandler,
  mdxJsxFlowElement: mdxJsxElementHandler,
  mdxJsxTextElement: mdxJsxElementHandler,
  mdxTextExpression: mdxExpressionHandler,
  // The handler type requires a return value. `() => {}` is void and does not typecheck.
  // oxlint-disable-next-line unicorn/no-useless-undefined
  mdxjsEsm: () => undefined,
  [NodeTypes.htmlBlock]: htmlBlockHandler,
};
