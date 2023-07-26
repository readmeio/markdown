const decode = require('parse-entities');

function tokenizer(eat, value) {
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const TAB_BLOCK_RGXP = /^(?:(?:^|\n)```(?:(?!\n```).)*\n```[^\S\n]*){2,}/gs;

  const [match] = TAB_BLOCK_RGXP.exec(value) || [];
  if (!match) return true;

  const kids = [];
  let codeBlock;

  /*
   * For each of our adjacent code blocks we'll split the matching block in to three parts:
   *    - [lang] syntax extension (optional)
   *    - [meta] tab name (optional)
   *    - [code] snippet text
   */
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const CODE_BLOCK_RGXP = /(?:^|\n)```[ \t]*(?<lang>[^\s]+)?(?: *(?<meta>[^\n]+))?(?<code>((?!\n```).)*)?\n```/gs;
  while ((codeBlock = CODE_BLOCK_RGXP.exec(match)) !== null) {
    // eslint-disable-next-line prefer-const
    let { lang, meta = '', code = '' } = codeBlock.groups;
    lang = lang ? decode(this.unescape(lang)) : lang;
    meta = decode(this.unescape(meta.trim()));

    kids.push({
      type: 'code',
      className: 'tab-panel',
      value: code.replace(/^\n/, ''),
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
    children: kids,
    data: {
      hName: 'code-tabs',
    },
  });
}

function parser() {
  const { Parser } = this;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  tokenizers.codeTabs = tokenizer;
  methods.splice(methods.indexOf('indentedCode') - 1, 0, 'codeTabs');
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;

  tags.push('code-tabs');

  return parser;
};
