const Emoji = require('@readme/emojis').emoji;
const { nameToEmoji } = require('gemoji');

const { insertInlineTokenizerBefore } = require('./utils');

const emojis = new Emoji();

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

  if (name in nameToEmoji) {
    return eat(match)({
      type: 'gemoji',
      value: nameToEmoji[name],
      name,
    });
  } else if (name.substr(0, 3) === 'fa-') {
    return eat(match)({
      type: 'i',
      data: {
        hName: 'i',
        hProperties: {
          className: ['fa', name],
        },
      },
    });
  } else if (emojis.is(name)) {
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
  }

  return false;
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
