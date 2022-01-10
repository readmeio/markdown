const { imgSizeByWidth } = require('../parse/magic-block-parser');

module.exports = function FigureCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.figure = function figureCompiler(node) {
    const [image, caption] = node.children;

    const img = {
      image: [image.url, image.title],
      caption: this.block(caption),
      sizing: imgSizeByWidth[image.data.hProperties.width ?? 'auto'],
    };

    if (image.border) img.border = image.border;

    const block = {
      images: [img],
    };

    return `[block:image]
${JSON.stringify(block, null, 2)}
[/block]`;
  };
};
