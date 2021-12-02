module.exports = function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;
  const { image: original } = visitors;

  visitors.image = function compile(node, ...args) {
    return node.data?.hProperties?.className === 'emoji' ? node.title : original.call(this, node, ...args);
  };
};
