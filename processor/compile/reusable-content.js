module.exports = function ReusableContentCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['reusable-content'] = node => `<ReadMeReusableContent name="${node.name}" />`;
};
