import { visit } from 'unist-util-visit';

export const type = 'reusable-content';

const regexp = /^\s*<(?<tag>[A-Z]\S+)\s*\/>\s*$/;

function reusableContentTransformer() {
  const { tags, disabled } = this.data('reusableContent');
  if (disabled) return () => undefined;

  return tree => {
    visit(tree, 'html', (node, index, parent) => {
      const result = regexp.exec(node.value);
      if (!result || !result.groups.tag) return;

      const { tag } = result.groups;

      const block = {
        type,
        tag,
        children: tag in tags ? tags[tag] : [],
      };

      parent.children[index] = block;
    });

    return tree;
  };
}

export default reusableContentTransformer;
