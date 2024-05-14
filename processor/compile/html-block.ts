import { HTMLBlock } from '../../types';

const htmlBlock = (node: HTMLBlock) => {
  const html = node.data.hProperties.html;
  return `<HTMLBlock>${JSON.stringify({ html }, null, 2)}</HTMLBlock>`;
}

export default htmlBlock;
