import type { ImageBlock } from 'types';
import { formatHProps, getHPropKeys, getHProps } from '../utils';

const image = (node: ImageBlock) => {
  const attributes = formatHProps<ImageBlock['data']['hProperties']>(node);
  const hProps = getHProps<ImageBlock['data']['hProperties']>(node);
  const hPropKeys = getHPropKeys<string[]>(node);
  
  const ImageBlock = `<Image ${attributes} />`;
  const MDImage = `![${node.alt ?? ''}](${hProps.src ? hProps.src : node.url}${node.title ? ` "${node.title}")` : ')'}`;

  if (Boolean(attributes)) {
    if (hPropKeys.includes('src') && (hPropKeys.includes('width') || hPropKeys.includes('border') || hPropKeys.includes('align'))) {
      return ImageBlock;
    }
  }
  return MDImage;
}

export default image;
