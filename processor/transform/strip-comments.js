import { SKIP, visit } from 'unist-util-visit';

const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;

const stripCommentsTransformer = () => tree => {
  console.log('STRIP COMMENTS TRANSFORMER', tree);

  visit(tree, (node, index, parent) => {
    // Remove HTML comments
    if (node.type === 'html' && HTML_COMMENT_REGEX.test(node.value)) {
      const newValue = node.value.replace(HTML_COMMENT_REGEX, '').trim();
      if (newValue) {
        node.value = newValue;
      } else {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
    }
    return node;
  });

  return tree;
};

export default stripCommentsTransformer;
