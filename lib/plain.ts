import { Nodes, Parents } from 'hast';

/* @note: copied from https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */

const plain = (node: Nodes, opts = {}) => {
  return 'children' in node ? all(node) || one(node) : one(node);
};

const one = (node: Nodes) => {
  if ('tagName' in node && node.tagName === 'img') {
    return node.properties?.title || '';
  }

  if (node.type === 'text') {
    return node.value;
  }

  if ('value' in node) {
    return node.value;
  }

  // eslint-disable-next-line no-use-before-define
  return 'children' in node ? all(node) : ' ';
};

const all = (node: Parents) => {
  let index = -1;
  const result = [];

  // eslint-disable-next-line no-plusplus
  while (++index < node.children.length) {
    result[index] = one(node.children[index]);
  }

  return result.join(' ').replaceAll(/\s+/g, ' ').trim();
};

export default plain;
