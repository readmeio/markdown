const nodeToString = require('hast-util-to-string');

const { imgSizeByWidth } = require('../parse/magic-block-parser');

module.exports = function FigureCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.figure = function figureCompiler(node) {
    const [image, caption] = node.children;

    const img = {
      image: [image.url, image.title],
      caption: nodeToString(caption),
      sizing: imgSizeByWidth[image.data.hProperties.width],
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
