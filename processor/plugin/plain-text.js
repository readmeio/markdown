/* @see: https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */

/* eslint-disable no-use-before-define */
function one(node, context) {
  if (node.tagName === 'rdme-callout') {
    const { icon, title } = node.properties;
    const body = all(node, context);
    return `${icon} ${title}: ${body}`;
  }

  if (node.tagName === 'readme-glossary-item') {
    return node.properties.term;
  }

  if (node.tagName === 'readme-variable') {
    const key = node.properties.variable;
    const val = context.variables[key];
    return val || `<<${key}>>`;
  }

  if (node.tagName === 'img') {
    return node.properties?.title || '';
  }

  if (node.type === 'text') {
    return node.value;
  }

  if ('value' in node) {
    return node.value;
  }

  return 'children' in node ? all(node, context) : ' ';
}
/* eslint-enable no-use-before-define */

function all(node, context) {
  let index = -1;
  const result = [];

  // eslint-disable-next-line no-plusplus
  while (++index < node.children.length) {
    result[index] = one(node.children[index], context);
  }

  return result.join(' ');
}

const toPlainText = function () {
  Object.assign(this, {
    Compiler: node => {
      const method = 'children' in node ? all || one : one;
      return method(node, this.data('context')).trim().replace(/\s+/g, ' ');
    },
  });
};

module.exports = toPlainText;
