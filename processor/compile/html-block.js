module.exports = function () {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['html-block'] = node => {
    const html = node.data.hProperties.html;
    return `
[block:html]${JSON.stringify({ html })}[/block]
`;
  };
};
