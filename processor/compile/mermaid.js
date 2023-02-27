const { MERMAID_BLOCK_LANG } = require('../../constants');

module.exports = function MermaidCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.mermaid = node => {
    return `\`\`\`${MERMAID_BLOCK_LANG}
${node.value.trim()}
\`\`\``;
  };
};
