const { SKIP, visit } = require('unist-util-visit');

const collectValues = ({ value, children }) => {
  if (value) return value;
  if (children) return children.flatMap(collectValues).join(' ');
  return '';
};

// Flattens table values and adds them as a seperate, easily-accessible key within children
function transformer(ast) {
  visit(ast, { tagName: 'table' }, node => {
    node.children.forEach(child => {
      child.value = collectValues(child).trimStart().trimEnd().replaceAll(/\s+/g, ' ');
    });

    return SKIP;
  });

  return ast;
}

module.exports = () => transformer;
module.exports.tableFlattening = transformer;
