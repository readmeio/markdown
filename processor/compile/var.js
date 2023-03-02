export default function RdmeVarCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['readme-variable'] = node => `<<${node.text}>>`;
}
