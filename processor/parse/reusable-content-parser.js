const { insertBlockTokenizerBefore } = require('./utils');

export const type = 'reusable-content';

function tokenizeReusableContent(eat, value, silent) {
  const { tags, disabled } = this.data('reusableContent');
  if (disabled) return false;

  // Modifies the regular expression to match from
  // the start of the line
  const match = /^<(?<tag>[A-Z]\S+)\s*\/>\s*/.exec(value);

  if (!match || !match.groups.tag) return false;
  const { tag } = match.groups;

  /* istanbul ignore if */
  if (silent) return true;

  const node = {
    type: 'reusable-content',
    tag,
    children: tag in tags ? tags[tag] : [],
  };

  return eat(match[0])(node);
}

function parser() {
  insertBlockTokenizerBefore.call(this, {
    name: 'reusableContent',
    before: 'html',
    tokenizer: tokenizeReusableContent.bind(this),
  });
}

export default parser;
