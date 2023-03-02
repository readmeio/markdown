const rgx = /^(#{1,6})(?!(?:#|\s))([^\n]+)\n/;

function tokenizer(eat, value) {
  if (!rgx.test(value)) return true;

  const [match, hash, text] = rgx.exec(value);

  const now = eat.now();
  now.column += match.length;
  now.offset += match.length;

  return eat(match)({
    type: 'heading',
    depth: hash.length,
    children: this.tokenizeInline(text, now),
  });
}

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  tokenizers.compactHeading = tokenizer;
  methods.splice(methods.indexOf('newline'), 0, 'compactHeading');
}

export default parser;

export const sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;
  tags.push('compactHeading');
  return parser;
};
