const blockHtml = htmlTokenizer => {
  return function tokenizer(...args) {
    const node = htmlTokenizer.call(this, ...args);

    if (node) {
      node.block = true;
    }

    return node;
  };
};

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;
  const { html } = tokenizers;

  tokenizers.html = blockHtml(html);
}

parser.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;

  tags.push('code-tabs');

  return parser;
};

export default parser;
