import { visit } from 'unist-util-visit';

export const type = 'reusable-content';
export const tag = 'RMReusableContent';

const regexp = /^\s*<RMReusableContent name="(?<name>.*)" \/>\s*$/;

const reusableContentTransformer = function () {
  const reusableContent = this.data('reusableContent');

  return tree => {
    visit(tree, 'html', (node, index, parent) => {
      const result = regexp.exec(node.value);
      if (!result || !result.groups.name) return;

      const { name } = result.groups;
      const block = {
        type,
        name,
        children: name in reusableContent ? reusableContent[name] : [],
      };

      parent.children[index] = block;
    });

    return tree;
  };
};

export default reusableContentTransformer;
