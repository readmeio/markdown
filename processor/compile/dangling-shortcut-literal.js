module.exports = function DanglingShortcutLiteralCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;
  const originalText = visitors.text;

  visitors.text = function compileText(node, ...rest) {
    if (node?.data?.danglingShortcutLiteral) return node.value;
    return originalText.call(this, node, ...rest);
  };
};
