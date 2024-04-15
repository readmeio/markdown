module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const originalImageCompiler = visitors.image;

  visitors.image = function compile(node, ...args) {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    const { align, className, width } = node.data?.hProperties || {};
    const complexImage = Boolean(width) || className?.length || Boolean(align);
    if (complexImage) return `<Image ${{...node.data.hProperties}} />`;

    return originalImageCompiler.call(this, node, ...args);
  };
};
