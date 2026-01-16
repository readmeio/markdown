import type { HTMLBlock } from '../../types';
import type { Properties } from 'hast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

import { NodeTypes } from '../../enums';
import { JSON_VALUE_MARKER } from '../transform/mdxish/preprocess-jsx-expressions';

// Convert MDX expressions to text nodes (evaluation happens earlier in pipeline)
const mdxExpressionHandler: Handler = (_state, node) => ({
  type: 'text',
  value: (node as { value?: string }).value || '',
});

// Since we serialize component / html tag attributes
function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
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
      // If the attribute value starts with the JSON_VALUE_MARKER,
      // it's an array / object that was serialized during JSX preprocessing
      if (attribute.name.startsWith(JSON_VALUE_MARKER)) {
        properties[attribute.name] = decodeHtmlEntities(attribute.value);
      }
      properties[attribute.name] = attribute.value;
    } else {
      properties[attribute.name] = (attribute.value as MdxJsxAttributeValueExpression).value;
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

  return {
    type: 'element',
    // To differentiate between regular embeds and magic block embeds,
    // magic block embeds have a certain hName
    tagName: data?.hName === NodeTypes.embedBlock ? 'Embed' : 'embed',
    properties: data?.hProperties,
    children: state.all(node),
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
