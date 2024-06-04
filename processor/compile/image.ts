import type { RMDXImage } from 'types';
import { formatHProps, getHPropKeys, getHProps } from '../utils';

const image = (node: RMDXImage) => {
  const attributes = formatHProps<RMDXImage['data']['hProperties']>(node);
  const hProps = getHProps<RMDXImage['data']['hProperties']>(node);
  const hPropKeys = getHPropKeys<string[]>(node);
  
  const RMDXImage = `<Image ${attributes} />`;
  const MDImage = `![${node.alt ?? ''}](${hProps.src ? hProps.src : node.url}${node.title ? ` "${node.title}")` : ')'}`;

  if (!!attributes) {
    if (hPropKeys.includes('src') && hPropKeys.includes('width' || 'border' || 'align'))
      return RMDXImage;
  }
  return MDImage;
}

export default image;
