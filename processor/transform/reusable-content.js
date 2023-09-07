import { visit } from 'unist-util-visit';

export const type = 'reusable-content';
export const tag = 'RMReusableContent';

const regexp = new RegExp(`^\\s*<${tag} slug="(?<slug>.*)" />\\s*$`);

const reusableContentTransformer = function () {
  const reusableContent = this.data('reusableContent');

  return tree => {
    visit(tree, 'html', (node, index, parent) => {
      const result = regexp.exec(node.value);
      if (!result || !result.groups.slug) return;

      const { slug } = result.groups;
      const block = {
        type,
        slug,
        children: slug in reusableContent ? reusableContent[slug] : [],
      };

      parent.children[index] = block;
    });

    return tree;
  };
};

export default reusableContentTransformer;
