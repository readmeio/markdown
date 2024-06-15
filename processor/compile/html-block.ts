import { run } from 'lib';
import { HTMLBlock } from '../../types';

const htmlBlock = (node: HTMLBlock) => {
  const { runScripts, html } = node.data.hProperties;

  return `<HTMLBlock${runScripts != null ? ' runScripts="' + runScripts + '"' : ''}>{${ html }}</HTMLBlock>`;
}

export default htmlBlock;
