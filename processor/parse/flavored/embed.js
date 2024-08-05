const { insertBlockTokenizerBefore } = require('../utils');

const rgx = /^\[([^\]]*)\]\((\S*) ["'](@\w+)"\)/;

function tokenizer(eat, value) {
  if (!rgx.test(value)) return true;

  // eslint-disable-next-line prefer-const
  let [match, title, url, provider] = rgx.exec(value);

  return eat(match)({
    type: 'embed',
    title,
    url,
    provider,
    data: {
      title,
      url,
      provider,
      hProperties: { title, url, provider },
      hName: 'rdme-embed',
    },
    children: [
      {
        type: 'link',
        url,
        title: provider,
        children: [{ type: 'text', value: title }],
      },
    ],
  });
}

function parser() {
  insertBlockTokenizerBefore.call(this, {
    name: 'embed',
    before: 'blankLine',
    tokenizer,
  });
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  const tags = sanitizeSchema.tagNames;
  tags.push('embed');
  return parser;
};
