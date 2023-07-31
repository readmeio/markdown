const { insertBlockTokenizerBefore } = require('./utils');

const rgx = /^(#{1,6})(?!(?:#|\s))([^\n]+)\n/;

function tokenizer(eat, value) {
  if (!rgx.test(value)) return true;

  const [match, hash, text] = rgx.exec(value);

  const now = eat.now();

  return eat(match)({
    type: 'heading',
    depth: hash.length,
    children: this.tokenizeInline(text, now),
  });
}

function parser() {
  insertBlockTokenizerBefore.call(this, {
    name: 'compactHeading',
    before: 'atxHeading',
    tokenizer,
  });
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;
  tags.push('compactHeading');
  return parser;
};
