import { HTMLBlock } from '../../types';

const htmlBlock = (node: HTMLBlock) => {
  const html = node.data.hProperties.html;
  const attributes = Object.keys(node.data?.hProperties).map(key => `${key}="${node.data?.hProperties[key]}"`).join(' ')
  return `<HTMLBlock${attributes && ' ' + attributes}>{\`${ html }\`}</HTMLBlock>`;
}

export default htmlBlock;
