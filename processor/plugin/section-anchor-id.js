const kebabCase = require('lodash.kebabcase');
const flatMap = require('unist-util-flatmap');

const matchTag = /^h[1-6]$/g;

/** Concat a deep text value from an AST node's children
 */
const getTexts = node => {
  let text = '';
  flatMap(node, kid => {
    text += kid.type === 'text' ? kid.value : '';
    return [kid];
  });
  return text;
};

/** Adds an empty <div id=section-slug> next to all headings
 *  for backwards-compatibility with how we used to do slugs.
 */
function transformer(ast) {
  return flatMap(ast, node => {
    if (matchTag.test(node.tagName)) {
      // Parse the node texts to construct
      // a backwards-compatible anchor ID.
      const text = getTexts(node);
      const id = `section-${kebabCase(text)}`;

      if (id && !node?.properties?.id) {
        // Use the compat anchor ID as fallback if
        // GitHubs slugger returns an empty string.
        node.properties.id = id;
      }

      // Create and append a compat anchor element
      // to the section heading.
      const anchor = {
        type: 'element',
        tagName: 'div',
        properties: { id, className: 'heading-anchor_backwardsCompatibility' },
      };
      if (node.children) node.children.unshift(anchor);
      else node.children = [anchor];
    }
    return [node];
  });
}

module.exports = () => transformer;
