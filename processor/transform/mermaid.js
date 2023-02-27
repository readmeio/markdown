import { visit } from 'unist-util-visit';

import { MERMAID_BLOCK_LANG } from '../../constants';

const mermaid = () => tree => {
  visit(tree, (node, index, parent) => {
    if (node.type === 'code' && node.lang === MERMAID_BLOCK_LANG && parent.type !== 'code-tabs') {
      parent.children[index] = {
        type: 'mermaid',
        value: node.value,
        data: {
          hName: 'div',
          hProperties: {
            className: MERMAID_BLOCK_LANG,
            value: node.value,
          },
        },
      };
    }
  });

  return tree;
};

export default mermaid;
