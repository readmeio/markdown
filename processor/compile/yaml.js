module.exports = function YamlCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.yaml = function compile(node) {
    return `---\n${node.value}\n---`;
  };
};
