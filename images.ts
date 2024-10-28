import type { $TSFixMe } from '@readme/iso';
import type { Image } from 'mdast';

import visit from 'unist-util-visit';

interface ImageBlock extends Image {
  data?: {
    hProperties?: {
      border?: boolean;
      className?: string;
    };
  };
}

const imageTransformer = () => (tree: $TSFixMe) => {
  visit(tree as $TSFixMe, 'image', (image: ImageBlock) => {
    if (image.data?.hProperties?.className === 'border') {
      delete image.data.hProperties.className;
      image.data.hProperties.border = true;
    }
  });
};

export default imageTransformer;
