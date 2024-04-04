module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const originalImageCompiler = visitors.image;

  visitors.image = function compile(node, ...args) {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    return originalImageCompiler.call(this, node, ...args);
  };
};
