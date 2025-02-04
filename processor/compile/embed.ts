import type { EmbedBlock } from 'types';

import { formatHProps, getHProps } from '../utils';

const embed = (node: EmbedBlock) => {
  const attributes = formatHProps<EmbedBlock['data']['hProperties']>(node)
  const props = getHProps<EmbedBlock['data']['hProperties']>(node);

  if (node.title !== '@embed') {
    return `<Embed ${attributes} />`
  }

  return `[${node.label || ''}](${props.url} "${node.title}")`
}

export default embed;
