const Owlmoji = require('../../lib/owlmoji');

const { insertInlineTokenizerBefore } = require('./utils');

const colon = ':';

function tokenize(eat, value, silent) {
  // Check if we’re at a short-code.
  if (value.charAt(0) !== colon) return false;

  const pos = value.indexOf(colon, 1);
  if (pos === -1) return false;

  const name = value.slice(1, pos);

  // Exit with true in silent
  if (silent) return true;

  const match = colon + name + colon;

  switch (Owlmoji.kind(name)) {
    case 'gemoji':
      return eat(match)({
        type: 'gemoji',
        value: Owlmoji.nameToEmoji[name],
        name,
      });
    case 'fontawesome':
      return eat(match)({
        type: 'i',
        data: {
          hName: 'i',
          hProperties: {
            className: ['fa', name],
          },
        },
      });
    case 'owlmoji':
      return eat(match)({
        type: 'image',
        title: `:${name}:`,
        alt: `:${name}:`,
        url: `/public/img/emojis/${name}.png`,
        data: {
          hProperties: {
            className: 'emoji',
            align: 'absmiddle',
            height: '20',
            width: '20',
          },
        },
      });
    default:
      return false;
  }
}

function locate(value, fromIndex) {
  return value.indexOf(colon, fromIndex);
}

tokenize.locator = locate;

function parser() {
  insertInlineTokenizerBefore.call(this, {
    name: 'gemoji',
    before: 'text',
    tokenizer: tokenize,
  });
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  // This is for font awesome gemoji codes
  sanitizeSchema.attributes.i = ['className'];
  return parser;
};
