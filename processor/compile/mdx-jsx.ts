import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

type MdxJsxElement = MdxJsxFlowElement | MdxJsxTextElement;

/**
 * Formats MDX JSX attributes into a string.
 * Handles string values, boolean attributes (null value), and expression values.
 */
function formatAttributes(attributes: MdxJsxElement['attributes']): string {
  if (!attributes || attributes.length === 0) return '';

  const parts = attributes.map(attr => {
    // Handle spread attributes (type: 'mdxJsxExpressionAttribute')
    if (attr.type === 'mdxJsxExpressionAttribute') {
      return `{...${attr.value}}`;
    }

    // Handle named attributes (type: 'mdxJsxAttribute')
    const { name, value } = attr;

    // Boolean attribute (no value)
    if (value === null || value === undefined) {
      return name;
    }

    // String value
    if (typeof value === 'string') {
      return `${name}="${value}"`;
    }

    // Expression value (MdxJsxAttributeValueExpression)
    if (value.type === 'mdxJsxAttributeValueExpression') {
      return `${name}={${value.value}}`;
    }

    return `${name}="${value}"`;
  });

  return parts.join(' ');
}

/**
 * Compiles an MDX JSX element (flow or text) back to markdown/JSX string.
 */
const mdxJsx = (node: MdxJsxElement, _parent: unknown, state: unknown, info: unknown) => {
  const { name, attributes, children } = node;

  // Fragment case (no name)
  if (!name) {
    if (children && children.length > 0) {
      // @ts-expect-error - state has containerFlow method
      return `<>${state.containerFlow(node, info)}</>`;
    }
    return '<></>';
  }

  const attrs = formatAttributes(attributes);
  const attrsStr = attrs ? ` ${attrs}` : '';

  // Self-closing tag (no children)
  if (!children || children.length === 0) {
    return `<${name}${attrsStr} />`;
  }

  // Tag with children
  // @ts-expect-error - state has containerFlow method
  const content = state.containerFlow(node, info);
  return `<${name}${attrsStr}>\n${content}</${name}>`;
};

export default mdxJsx;
