module.exports = function GemojiCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.gemoji = node => `:${node.name}:`;
};
