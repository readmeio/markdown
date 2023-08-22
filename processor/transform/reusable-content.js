import { visit } from 'unist-util-visit';

const type = 'reusable-content';

const regexp = /^\s*<ReadMeReusableContent name="(?<name>.*)" \/>\s*$/;

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
