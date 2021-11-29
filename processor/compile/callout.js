module.exports = function CalloutCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['rdme-callout'] = function compile(node) {
    let block = this.block(node).replace(/\n/g, '\n> ');
    block = `> ${node.data.hProperties.icon} ${block}`;

    return block;
  };
};
