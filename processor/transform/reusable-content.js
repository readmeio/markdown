import { visit } from 'unist-util-visit';

export const type = 'reusable-content';

const regexp = /^\s*<(?<tag>[A-Z]\S+)\s*\/>\s*$/;

const reusableContentTransformer = function () {
  const { tags, disabled } = this.data('reusableContent');
  if (disabled) return () => undefined;

  return tree => {
    visit(tree, 'html', (node, index, parent) => {
      const result = regexp.exec(node.value);
      if (!result || !result.groups.tag) return;
      const { tag } = result.groups;

      const block = tag in tags ? [...tags[tag]].pop() : null;

      parent.children[index] = block;
    });

    return tree;
  };
};

export default reusableContentTransformer;
