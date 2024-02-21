module.exports = function () {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['html-block'] = node => {
    const html = node.data.hProperties.html;
    return `[block:html]\n${JSON.stringify({ html }, null, 2)}\n[/block]`;
  };
};
