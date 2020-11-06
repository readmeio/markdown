// eslint-disable-next-line unicorn/no-unsafe-regex
const TAB_BLOCK_RGXP = /^(?:(?:^|\n)```(?:(?!\n```).)*\n```[^\S\n]*){2,}/gs;
/*
 * For each of our adjacent code blocks we'll split the matching block in to three parts:
 *    - [lang] syntax extension
 *    - [meta] tab name (optional)
 *    - [code] snippet text
 */
// eslint-disable-next-line unicorn/no-unsafe-regex
const CODE_BLOCK_RGXP = /(?:^|\n)```[ \t]*(?<lang>[^\s]+)?(?: *(?<meta>[^\n]+))?\n(?<code>((?!\n```).)*)\n```/gs;

function tokenizer(eat, value) {
  const [match] = TAB_BLOCK_RGXP.exec(value) || [];

  if (!match) return true;

  const kids = [];
  let codeBlock;
  // TODO: once the node version is updated, this should be able to use
  // String.matchAll() and replace this with a for...in.
  // eslint-disable-next-line no-cond-assign
  while ((codeBlock = CODE_BLOCK_RGXP.exec(match)) !== null) {
    // eslint-disable-next-line prefer-const
    let { lang, meta = '', code = '' } = codeBlock.groups;
    meta = meta.trim();

    kids.push({
      type: 'code',
      className: 'tab-panel',
      value: code.trim(),
      meta,
      lang,
      data: {
        hName: 'code',
        hProperties: { meta, lang },
      },
    });
  }

  // return a tabbed code block
  return eat(match)({
    type: 'code-tabs',
    className: 'tabs',
    data: { hName: 'code-tabs' },
    children: kids,
  });
}

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  tokenizers.CodeTabs = tokenizer;
  methods.splice(methods.indexOf('newline'), 0, 'CodeTabs');
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;

  tags.push('code-tabs');

  return parser;
};
