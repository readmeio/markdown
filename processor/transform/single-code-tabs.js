import { visit } from 'unist-util-visit';

const singleCodeTabs = () => tree =>
  visit(tree, (node, index, parent) => {
    if (node.type === 'code' && (node.lang || node.meta) && parent.type !== 'code-tabs') {
      node.data = {
        hName: 'code',
        hProperties: { meta: node.meta, lang: node.lang },
      };
      parent.children[index] = {
        type: 'code-tabs',
        className: 'tabs',
        data: { hName: 'code-tabs' },
        children: [node],
      };
    }
  });

export default singleCodeTabs;
