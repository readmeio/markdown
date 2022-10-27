const blockHtml = htmlTokenizer => {
  return function tokenizer(...args) {
    const node = htmlTokenizer.call(this, ...args);

    if (typeof node === 'object') {
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

export default parser;
