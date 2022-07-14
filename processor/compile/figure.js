const { imgSizeByWidth } = require('../parse/magic-block-parser');

const compileImage = image => {
  const img = {
    image: [image.url, image.title, image.alt],
    ...(image.data.hProperties.width && { sizing: imgSizeByWidth[image.data.hProperties.width] }),
    ...(image.border && { border: image.border }),
  };

  return img;
};

module.exports = function FigureCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.figure = function figureCompiler(node) {
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

    return `[block:image]
${JSON.stringify(block, null, 2)}
[/block]`;
  };
};
