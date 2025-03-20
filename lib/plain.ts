/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Nodes, Parents } from 'hast';

import { fromHtml } from 'hast-util-from-html';

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

    switch (node.tagName) {
      case 'html-block': {
        if (!node.properties.html) return '';
        return all(fromHtml(node.properties.html.toString()), opts);
      }
      case 'rdme-callout': {
        const { icon, title } = node.properties;

        const children = node?.children?.slice(title ? 1 : 0);
        const body = children ? all({ type: 'root', children }, opts) : '';

        return [icon, ' ', title, title && body && ': ', body].filter(Boolean).join('');
      }
      case 'readme-glossary-item': {
        return node.properties.term;
      }
      case 'readme-variable': {
        const key = node.properties.variable.toString();
        const val = opts.variables[key];
        return val || `<<${key}>>`;
      }
      case 'img': {
        return node.properties?.title || '';
      }
      case 'Accordion':
      case 'Card':
      case 'Tab': {
        const title = node.properties?.title || '';
        const children = node?.children;
        const body = children ? all({ type: 'root', children }, opts) : '';

        return [title, body].filter(Boolean).join(' ');
      }
      default:
        break;
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
