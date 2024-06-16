import { Node } from 'mdast';
import { MdxJsxFlowElement, MdxJsxTextElement, MdxFlowExpression } from 'mdast-util-mdx';

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

export const getChildren = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement) =>
    jsx.children.reduce((memo, child: MdxFlowExpression, i) => {
     memo[i] = {
      // TODO: infer type
      type: 'text',
      value: child.value,
      position: child.position,
     };
      return memo;
    }, [] as T);

export const isMDXElement = (node: Node): node is MdxJsxFlowElement | MdxJsxTextElement => {
  return ['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type);
}

export const formatHTML = (html: string): string => {
  if (html.startsWith('`') && html.endsWith('`')) {
    html = html.slice(1, -1);
  }
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '');
  const tab = cleaned.match(/^\s*/)[0].length;
  const tabRegex = new RegExp(`^\\s{${tab}}`, 'gm');
  const unindented = cleaned.replace(tabRegex, '');
  return unindented;
}

export const reformatHTML = (html: string, indent = 2) => {
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '');
  const tab = ' '.repeat(indent);
  const indented = cleaned.split('\n').map((line: string) => `${tab}${line}`).join('\n');
  return indented;
}