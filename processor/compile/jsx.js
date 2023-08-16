module.exports = function JsxCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.jsx = function compile(node) {
    return node.value;
  };
};
