import { visit } from 'unist-util-visit';

import { type } from '../parse/reusable-content-parser';

function reusableContent() {
  const { wrap = true } = this.data('reusableContent');

  return tree => {
    if (wrap) return tree;

    visit(tree, type, (node, index, parent) => {
      parent.children.splice(index, 1, ...node.children);
    });

    return tree;
  };
}

export default reusableContent;
