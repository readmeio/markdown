import type { HTMLBlock } from '../../types';

import { reformatHTML, getHProps } from '../utils'

const htmlBlock = (node: HTMLBlock) => {
  const { runScripts, html } = getHProps<HTMLBlock['data']['hProperties']>(node);

  return `<HTMLBlock${runScripts != null ? ` runScripts="${runScripts}"` : ''}>{\`
${ reformatHTML(html) }
\`}</HTMLBlock>`;
}

export default htmlBlock;
