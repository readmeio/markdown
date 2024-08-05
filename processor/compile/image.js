module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const originalImageCompiler = visitors.image;

  visitors.image = function compile(node, ...args) {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    // Use magic block instead of markdown when there are certain defined properties we can't store in markdown
    const { align, className, width } = node.data?.hProperties || {};
    const useMagicBlock = Boolean(width) || className?.length || Boolean(align);
    if (useMagicBlock) return visitors.figure.call(this, node, ...args);

    return originalImageCompiler.call(this, node, ...args);
  };
};
