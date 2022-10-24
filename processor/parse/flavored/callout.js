/* eslint-disable no-plusplus */
/* eslint-disable consistent-return */
import emojiRegex from 'emoji-regex';
import interrupt from 'remark-parse/lib/util/interrupt';
import trim from 'trim';

const themes = {
  '\uD83D\uDCD8': 'info',
  '\uD83D\uDEA7': 'warn',
  '\u26A0\uFE0F': 'warn',
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

export const icons = Object.entries(themes).reduce((acc, [icon, theme]) => {
  if (!acc[theme]) acc[theme] = [];
  acc[theme].push(icon);

  return acc;
}, {});

const linefeed = '\n';
const tab = '\t';
const space = ' ';
const greaterthan = '>';

// @note: Copied directly from remark-parse, but it's been updated to match our
// style conventions and to parse Callouts.
function blockquoteReadme(eat, value, silent) {
  const self = this;
  const offsets = self.offset;
  const tokenizers = self.blocktokenizers;
  const interruptors = self.interruptblockquote;
  const now = eat.now();
  let currentline = now.line;
  let length = value.length;
  const values = [];
  let contents = [];
  const indents = [];
  let index = 0;
  let character;
  let rest;
  let nextindex;
  let content;
  let line;
  let startindex;
  let prefixed;
  let icon;

  while (index < length) {
    character = value.charAt(index);

    if (character !== space && character !== tab) {
      break;
    }

    index++;
  }

  if (value.charAt(index) !== greaterthan) {
    return;
  }

  if (silent) {
    return true;
  }

  index = 0;

  while (index < length) {
    nextindex = value.indexOf(linefeed, index);
    startindex = index;
    prefixed = false;

    if (nextindex === -1) {
      nextindex = length;
    }

    while (index < length) {
      character = value.charAt(index);

      if (character !== space && character !== tab) {
        break;
      }

      index++;
    }

    if (value.charAt(index) === greaterthan) {
      index++;
      prefixed = true;

      if (value.charAt(index) === space) {
        index++;
      }
    } else {
      index = startindex;
    }

    content = value.slice(index, nextindex);

    if (!prefixed && !trim(content)) {
      index = startindex;
      break;
    }

    if (!prefixed) {
      rest = value.slice(index);

      // check if the following code contains a possible block.
      if (interrupt(interruptors, tokenizers, self, [eat, rest, true])) {
        break;
      }
    }

    line = startindex === index ? content : value.slice(startindex, nextindex);

    indents.push(index - startindex);
    values.push(line);
    contents.push(content);

    index = nextindex + 1;
  }

  index = -1;
  length = indents.length;
  const add = eat(values.join(linefeed));

  while (++index < length) {
    offsets[currentline] = (offsets[currentline] || 0) + indents[index];
    currentline++;
  }

  let match;
  let title;
  let body;
  if ((match = contents[0].match(`^(${emojiRegex()})(\\s+|$)`))) {
    icon = match[1];
    contents[0] = contents[0].slice(match[0].length);

    title = contents[0];
    body = trim(contents.slice(1).join(linefeed));
  }

  const exit = self.enterBlock();
  contents = self.tokenizeBlock(contents.join(linefeed), now);
  exit();

  if (icon) {
    const data = {
      hName: 'rdme-callout',
      hProperties: {
        title,
        value: body,
        icon,
        theme: themes[icon] || 'default',
      },
    };
    return add({ type: 'rdme-callout', children: contents, data });
  }

  return add({ type: 'blockquote', children: contents });
}

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;

  tokenizers.blockquote = blockquoteReadme;
}

export default parser;

export function sanitize(sanitizeSchema) {
  const tags = sanitizeSchema.tagNames;
  const attr = sanitizeSchema.attributes;

  tags.push('rdme-callout');
  attr['rdme-callout'] = ['icon', 'theme', 'title', 'value'];

  return parser;
}

parser.sanitize = sanitize;
