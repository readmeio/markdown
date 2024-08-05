module.exports = function FaEmojiCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.i = function compile(node) {
    return `:${node.data.hProperties.className[1]}:`;
  };
};
