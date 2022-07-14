const emojiRegex = require('emoji-regex');

// We're pulling out the necessary regex from `emoji-regex` because it ships itself with regex
// slashes and if we were to embed `emoji-regex` directly into our regex for matching callouts the
// callout regex wouldn't work at all.
let ergx = emojiRegex().toString();
ergx = ergx.substring(1, ergx.length - 2);

// `emoji-regex` can't match unicode emoji like `✎` that folks might use as callout icons so we
// need to augment our regex a bit.
const unicodeRgx = '\u00a9|\u00ae|[\u2000-\u3300]|[\u{1f000}-\u{1fbff}]';

const rgx = new RegExp(`^> ?(${unicodeRgx}|${ergx})(?: {0,}(.+))?\n((?:>(?: .*)?\n)*)`, 'u');

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
