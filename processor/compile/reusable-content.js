import { type } from '../transform/reusable-content';

export default function ReusableContentCompiler() {
  const { writeTags } = this.data('reusableContent');
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors[type] = function (node) {
    return writeTags ? `<${node.tag} />` : this.block(node);
  };
}
