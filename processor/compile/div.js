module.exports = function DivCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.div = function compile(node) {
    const data = node.data.hProperties;

    return `
[block:${node.data.hName}]${JSON.stringify(data)}[/block]
`;
  };
};
