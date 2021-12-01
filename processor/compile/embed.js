function EmbedCompiler(node) {
  const data = node.data.hProperties;
  let { provider = 'embed' } = data;
  provider = provider.replace(/^@/, '');

  return `
[block:embed]
${JSON.stringify({ ...data, provider }, null, 2)}
[/block]
`;
}

module.exports = function () {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.embed = EmbedCompiler;
};
