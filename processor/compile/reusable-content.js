import { type } from '../transform/reusable-content';

export default function ReusableContentCompiler() {
  const { serialize = true } = this.data('reusableContent') || {};
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors[type] = function (node) {
    return serialize ? `<${node.tag} />` : this.block(node);
  };
}
