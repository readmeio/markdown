module.exports = function CodeTabsCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  function compile(node) {
    const fence = '```';

    return node.children
      .map(code => {
        return `${fence}${code.lang || ''}${code.meta ? ` ${code.meta}` : ''}\n${
          code.value ? `${code.value}\n` : ''
        }${fence}`;
      })
      .join('\n');
  }

  visitors['code-tabs'] = compile;
};
