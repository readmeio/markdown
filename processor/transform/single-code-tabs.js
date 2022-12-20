import visit from 'unist-util-visit';

const singleCodeTabsTransformer = () => tree => {
  const singleCodeTabs = (node, parent, index) => {
    if (node.type === 'code' && (node.lang || node.meta) && parent.type !== 'code-tabs') {
      parent.children[index] = {
        type: 'code-tabs',
        className: 'tabs',
        data: { hName: 'code-tabs' },
        children: [node],
      };
    }
  };

  visit(tree, singleCodeTabs);
};

export default singleCodeTabsTransformer;
