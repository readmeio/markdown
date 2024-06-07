import { Node } from 'mdast';
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

export const formatHProps = <T>(node: Node) => {
  const hProps = getHProps(node);
  const hPropKeys = getHPropKeys(node) as string[];
  return hPropKeys.map(key => `${key}="${hProps[key]}"`).join(' ') as T;
}

export const getHProps = <T>(node: Node) => {
  const hProps = node.data?.hProperties || {};
  return hProps as T;
}

export const getHPropKeys = <T>(node: Node) => { 
  const hProps = getHProps(node);
  return Object.keys(hProps) || [] as T;
}

export const getAttrs = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement) =>
  jsx.attributes.reduce((memo, attr) => {
    if ('name' in attr) {
      memo[attr.name] = attr.value;
    }

    return memo;
  }, {} as T);

export const isMDXElement = (node: Node): node is MdxJsxFlowElement | MdxJsxTextElement => {
  return ['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type);
}
