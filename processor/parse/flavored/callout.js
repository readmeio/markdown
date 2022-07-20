const emojiRegex = require('emoji-regex');

const rgx = new RegExp(`^> ?(${emojiRegex().source})(?: +(.+))?\n((?:>(?: .*)?\n)*)`);

const themes = {
  '\uD83D\uDCD8': 'info',
  '\u26A0\uFE0F': 'warn',
  '\uD83D\uDEA7': 'warn',
  '\uD83D\uDC4D': 'okay',
  '\u2705': 'okay',
  '\u2757': 'error',
  '\u2757\uFE0F': 'error',
  '\uD83D\uDED1': 'error',
  '\u2049\uFE0F': 'error',
  '\u203C\uFE0F': 'error',
  '\u2139\uFE0F': 'info',
  '\u26A0': 'warn',
};

const icons = Object.entries(themes).reduce((acc, [icon, theme]) => {
  if (!acc[theme]) acc[theme] = [];
  acc[theme].push(icon);

  return acc;
}, {});

function tokenizer(eat, value) {
  if (!rgx.test(value)) return true;

  // eslint-disable-next-line prefer-const
  let [match, icon, title = '', text] = value.match(rgx);

  icon = icon.trim();
  text = text.replace(/^>(?:(\n)|(\s)?)/gm, '$1').trim();
  title = title.trim();

  const style = themes[icon];

  return eat(match)({
    type: 'rdme-callout',
    data: {
      hName: 'rdme-callout',
      hProperties: {
        theme: style || 'default',
        icon,
        title,
        value: text,
      },
    },
    children: [...this.tokenizeBlock(title, eat.now()), ...this.tokenizeBlock(text, eat.now())],
  });
}

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  tokenizers.callout = tokenizer;
  methods.splice(methods.indexOf('newline'), 0, 'callout');
}

module.exports = parser;

module.exports.icons = icons;

module.exports.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;
  const attr = sanitizeSchema.attributes;

  tags.push('rdme-callout');
  attr['rdme-callout'] = ['icon', 'theme', 'title', 'value'];

  return parser;
};
