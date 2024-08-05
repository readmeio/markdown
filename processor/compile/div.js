import magicBlock from './magic-block';

export default function DivCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.div = function compile(node, parent) {
    const data = node.data.hProperties;

    return magicBlock(node.data.hName, data, parent);
  };
}
