import type { Image } from 'mdast';

import { visit } from 'unist-util-visit';

interface ImageBlock extends Image {
  data?: {
    hProperties?: {
      border?: boolean;
      className?: string;
    };
  };
}

const imageTransformer = () => (tree: $TSFixMe) => {
  visit(tree, 'image', (image: ImageBlock) => {
    if (image.data?.hProperties?.className === 'border') {
      image.data.hProperties.border = true;
    }
  });
};

export default imageTransformer;
