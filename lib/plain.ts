import { Nodes, Parents } from 'hast';

import hast from './hast';

/* @note: adapted from https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */

interface Options {
  variables?: Record<string, string>;
}

const STRIP_TAGS = ['script', 'style'];

function one(node: Nodes, opts: Options) {
  if (node.type === 'comment') return '';

  if ('type' in node && node.type === 'text') {
    return node.value;
  }

  if ('tagName' in node) {
    if (STRIP_TAGS.includes(node.tagName)) return '';

    if (node.tagName === 'html-block') {
      if (!node.properties.html) return '';
      return all(hast(node.properties.html.toString()), opts);
    }

    if (node.tagName === 'rdme-callout') {
      const { icon, title } = node.properties;

      const children = node?.children?.slice(title ? 1 : 0);
      const body = children ? all({ type: 'root', children }, opts) : '';

      return [icon, ' ', title, title && body && ': ', body].filter(Boolean).join('');
    }

    if (node.tagName === 'readme-glossary-item') {
      return node.properties.term;
    }

    if (node.tagName === 'readme-variable') {
      const key = node.properties.variable.toString();
      const val = opts.variables[key];
      return val || `<<${key}>>`;
    }

    if (node.tagName === 'img') {
      return node.properties?.title || '';
    }
  }

  if ('value' in node) {
    return node.value;
  }

  return 'children' in node ? all(node, opts) : ' ';
}

function all(node: Parents, opts: Options) {
  let index = -1;
  const result = [];

  // eslint-disable-next-line no-plusplus
  while (++index < node?.children.length) {
    result[index] = one(node.children[index], opts);
  }

  return result.join(' ').replaceAll(/\s+/g, ' ').trim();
}

const plain = (node: Nodes, opts: Options = {}) => {
  return 'children' in node ? all(node, opts) || one(node, opts) : one(node, opts);
};

export default plain;
