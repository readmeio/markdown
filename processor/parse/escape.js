// @note: this is copied from https://github.com/remarkjs/remark/blob/remark-parse%407.0.2/packages/remark-parse/lib/tokenize/escape.js

const lineFeed = '\n';
const backslash = '\\';

// eslint-disable-next-line consistent-return
function escape(eat, value, silent) {
  const self = this;
  let character;
  let node;

  if (value.charAt(0) === backslash) {
    character = value.charAt(1);

    if (self.escape.indexOf(character) !== -1) {
      if (silent) {
        return true;
      }

      if (character === lineFeed) {
        node = { type: 'break' };
      } else {
        node = { type: 'escape', value: character };
      }

      return eat(backslash + character)(node);
    }
  }
}

function locate(value, fromIndex) {
  return value.indexOf('\\', fromIndex);
}

escape.locator = locate;

function parser() {
  const { Parser } = this;
  const { inlineTokenizers } = Parser.prototype;

  inlineTokenizers.escape = escape;
}

parser.sanitize = () => parser;

export default parser;
