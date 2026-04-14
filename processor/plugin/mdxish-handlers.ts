import type { HTMLBlock } from '../../types';
import type { Properties } from 'hast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

import { NodeTypes } from '../../enums';
import { JSON_VALUE_MARKER } from '../transform/mdxish/preprocess-jsx-expressions';
import { evaluateAttributeExpression } from '../utils';

// Convert MDX expressions to text nodes (evaluation happens earlier in pipeline)
const mdxExpressionHandler: Handler = (_state, node) => ({
  type: 'text',
  value: (node as { value?: string }).value || '',
});

// Since we serialize component / html tag attributes
function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#10;/g, '\n')
    .replace(/&amp;/g, '&');
}

/**
 * Encode a hast property value so it survives rehypeRaw's HTML serialization step.
 * Strings and booleans pass through untouched — booleans are preserved across the
 * round-trip by a dedicated plugin wrapped around rehypeRaw. Everything else —
 * numbers, objects, arrays — gets wrapped in a JSON marker string, which the render
 * layer unwraps back into a real JS value before passing it to React.
 */
function encodePropertyValue(value: unknown): Properties[string] {
  if (value === null || value === undefined) return value as Properties[string];
  const type = typeof value;
  if (type === 'string' || type === 'boolean') {
    return value as Properties[string];
  }
  return `${JSON_VALUE_MARKER}${JSON.stringify(value)}`;
}

// Convert MDX JSX elements to HAST elements, preserving attributes and children
const mdxJsxElementHandler: Handler = (state, node) => {
  const { attributes = [], name } = node as { attributes?: MdxJsxAttribute[]; name?: string };
  const properties: Properties = {};

  attributes.forEach(attribute => {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) return;

    if (attribute.value === null) {
      properties[attribute.name] = true;
    } else if (typeof attribute.value === 'string') {
      properties[attribute.name] = decodeHtmlEntities(attribute.value);
    } else {
      const expressionSource = (attribute.value as MdxJsxAttributeValueExpression).value;
      properties[attribute.name] = encodePropertyValue(evaluateAttributeExpression(expressionSource));
    }
  });

  return {
    type: 'element',
    tagName: name || '',
    properties,
    children: state.all(node),
  };
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

export const mdxComponentHandlers: Handlers = {
  embed: embedHandler,
  mdxFlowExpression: mdxExpressionHandler,
  mdxJsxFlowElement: mdxJsxElementHandler,
  mdxJsxTextElement: mdxJsxElementHandler,
  mdxTextExpression: mdxExpressionHandler,
  mdxjsEsm: () => undefined,
  [NodeTypes.htmlBlock]: htmlBlockHandler,
};
