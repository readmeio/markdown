import { insertBlockTokenizerBefore, insertInlineTokenizerBefore } from '../../processor/parse/utils';

let self;

beforeEach(() => {
  self = {
    Parser: {
      prototype: {
        blockTokenizers: {},
        blockMethods: ['one', 'two'],
        inlineTokenizers: {},
        inlineMethods: ['one', 'two'],
      },
    },
  };
});

describe('insertBlockTokenizerBefore', () => {
  it('correctly splices the tokenizer into place', () => {
    insertBlockTokenizerBefore.call(self, {
      name: 'test',
      before: 'one',
      tokenizer: () => {},
    });

    expect(self.Parser.prototype.blockMethods).toStrictEqual(['test', 'one', 'two']);
    expect(self.Parser.prototype.blockTokenizers).toHaveProperty('test');
  });

  it('throws an error if the method does not exist', () => {
    expect(() =>
      insertBlockTokenizerBefore.call(self, {
        name: 'test',
        before: 'oh no',
        tokenizer: () => {},
      }),
    ).toThrow("The 'oh no' tokenizer does not exist!");
  });
});

describe('insertInlineTokenizerBefore', () => {
  it('correctly splices the tokenizer into place', () => {
    insertInlineTokenizerBefore.call(self, {
      name: 'test',
      before: 'one',
      tokenizer: () => {},
    });

    expect(self.Parser.prototype.inlineMethods).toStrictEqual(['test', 'one', 'two']);
    expect(self.Parser.prototype.inlineTokenizers).toHaveProperty('test');
  });

  it('throws an error if the method does not exist', () => {
    expect(() =>
      insertInlineTokenizerBefore.call(self, {
        name: 'test',
        before: 'oh no',
        tokenizer: () => {},
      }),
    ).toThrow("The 'oh no' tokenizer does not exist!");
  });
});
