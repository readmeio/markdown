import type { Properties } from 'hast';
import type { MdxJsxAttribute, MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { Handler, Handlers } from 'mdast-util-to-hast';

// Convert inline/flow MDX expressions to plain text so rehype gets a text node (no evaluation here).
const mdxExpressionHandler: Handler = (_state, node) => ({
  type: 'text',
  value: (node as { value?: string }).value || '',
});

// Convert MDX JSX nodes back to HAST elements, carrying over props and children
// Making this consistent with the other nodes
const mdxJsxElementHandler: Handler = (state, node) => {
  const { attributes = [], name } = node as { attributes?: MdxJsxAttribute[]; name?: string };
  const properties: Properties = {};

  attributes.forEach(attribute => {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) return;

    if (attribute.value === null || typeof attribute.value === 'undefined') {
      properties[attribute.name] = true;
    } else if (typeof attribute.value === 'string') {
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

export const mdxComponentHandlers: Handlers = {
  mdxFlowExpression: mdxExpressionHandler,
  mdxJsxFlowElement: mdxJsxElementHandler,
  mdxJsxTextElement: mdxJsxElementHandler,
  mdxTextExpression: mdxExpressionHandler,
  mdxjsEsm: () => undefined,
};
