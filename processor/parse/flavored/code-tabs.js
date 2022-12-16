/* eslint-disable consistent-return */
function tokenizer(eat, value) {
  const kids = [];
  let match = '';
  let codeBlock;

  /*
   * For each of our adjacent code blocks we'll split the matching block in to three parts:
   *    - [lang] syntax extension (optional)
   *    - [meta] tab name (optional)
   *    - [code] snippet text
   */
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const CODE_BLOCK_RGXP = /(?:^|\n)```[ \t]*(?<lang>[^\s]+)?(?: *(?<meta>[^\n]+))?(?<code>((?!\n```).)*)?\n```/gs;
  while ((codeBlock = CODE_BLOCK_RGXP.exec(value)) !== null) {
    // eslint-disable-next-line prefer-const
    let { lang, meta = '', code = '' } = codeBlock.groups;
    meta = meta.trim();

    match += codeBlock[0];

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

  if (!match) return;

  const block =
    kids.length > 1 || kids[0].meta || kids[0].lang
      ? {
          type: 'code-tabs',
          className: 'tabs',
          data: { hName: 'code-tabs' },
          children: kids,
        }
      : kids[0];

  return eat(match)(block);
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
