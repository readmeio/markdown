import { visit } from 'unist-util-visit';

export const type = 'reusable-content';

const regexp = /^\s*<(?<tag>[A-Z]\S+)\s*\/>\s*$/;

const reusableContentTransformer = function () {
  const { tags, disabled, writeTags = true } = this.data('reusableContent');
  if (disabled) return () => undefined;

  return tree => {
    visit(tree, 'html', (node, index, parent) => {
      const result = regexp.exec(node.value);
      if (!result || !result.groups.tag) return;
      const { tag } = result.groups;

      if (writeTags) {
        parent.children[index] = { type, tag, children: tag in tags ? tags[tag] : [] };
      } else {
        parent.children[index] = tag in tags ? [...tags[tag]].pop() : {};
      }
    });

    return tree;
  };
};

export default reusableContentTransformer;
