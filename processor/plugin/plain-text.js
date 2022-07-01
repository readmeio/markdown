const toString = require('hast-util-to-string');

const Compiler = node => {
  console.log(JSON.stringify({ node }, null, 2));
  return toString(node);
};

const toPlainText = function () {
  Object.assign(this, { Compiler });
};

module.exports = toPlainText;
