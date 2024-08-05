function insertTokenizerBefore({ name, before, tokenizer, type = 'block' }) {
  const { Parser } = this;
  const tokenizers = Parser.prototype[`${type}Tokenizers`];
  const methods = Parser.prototype[`${type}Methods`];

  const index = methods.indexOf(before);
  if (index === -1) {
    throw new Error(`The '${before}' tokenizer does not exist!`);
  }

  tokenizers[name] = tokenizer;
  methods.splice(index, 0, name);
}

export function insertBlockTokenizerBefore(args) {
  insertTokenizerBefore.call(this, args);
}

export function insertInlineTokenizerBefore(args) {
  return insertTokenizerBefore.call(this, { ...args, type: 'inline' });
}
