module.exports = function EscapeCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.escape = function compile(node) {
    return `\\${node.value}`;
  };
};
