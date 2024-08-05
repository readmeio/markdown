module.exports = function RdmeGlossaryCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['readme-glossary-item'] = node => `<<glossary:${node.data.hProperties.term}>>`;
};
