import { type } from '../transform/reusable-content';

export default function ReusableContentCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors[type] = node => `<${node.tag} />`;
}
