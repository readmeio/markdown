/* @note: copied from https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */
function toString(node) {
  // eslint-disable-next-line no-use-before-define
  return 'children' in node ? all(node) : one(node);
}

function one(node) {
  if (node.tagName === 'img') {
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
}

function all(node) {
  let index = -1;
  const result = [];

  // eslint-disable-next-line no-plusplus
  while (++index < node.children.length) {
    result[index] = one(node.children[index]);
  }

  return result.join(' ').trim().replace(/ +/, ' ');
}

const Compiler = node => {
  return toString(node);
};

const toPlainText = function () {
  Object.assign(this, { Compiler });
};

module.exports = toPlainText;
