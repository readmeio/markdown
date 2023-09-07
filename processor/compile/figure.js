import { imgSizeByWidth } from '../parse/magic-block-parser';

import magicBlock from './magic-block';

const compileImage = image => {
  const { align, className, width } = image.data.hProperties || {};
  const img = {
    image: [image.url, image.title, image.alt],
    ...(align && { align }),
    ...(width && { sizing: imgSizeByWidth[width] }),
    ...(className === 'border' && { border: true }),
  };

  return img;
};

export default function FigureCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.figure = function figureCompiler(node, parent) {
    let image;
    let caption;

    if (node.children) {
      [image, caption] = node.children;
    } else {
      image = node;
    }

    const img = compileImage(image);
    if (caption) img.caption = this.block(caption);

    const block = {
      images: [img],
    };

    return magicBlock('image', block, parent);
  };
}
