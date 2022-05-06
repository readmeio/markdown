module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const originalImageCompiler = visitors.image;

  visitors.image = function compile(node, ...args) {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    if (node.data?.hProperties?.width) return visitors.figure.call(this, node, ...args);

    return originalImageCompiler.call(this, node, ...args);
  };
};
