module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.image = function compile(node, ...args) {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    return visitors.figure.call(this, node, ...args);
  };
};
