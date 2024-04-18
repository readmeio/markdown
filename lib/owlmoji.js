const { gemoji, nameToEmoji } = require('gemoji');

const owlmoji = [
  {
    names: ['owlbert'],
    tags: ['owlbert'],
    description: 'owlbert',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-books'],
    tags: ['owlbert'],
    description: 'owlbert carrying books',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-mask'],
    tags: ['owlbert with a respirator'],
    description: 'owlbert',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-reading'],
    tags: ['owlbert reading'],
    description: 'owlbert',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-thinking'],
    tags: ['owlbert thinking'],
    description: 'owlbert',
    category: 'ReadMe',
  },
];

const owlmojiNames = owlmoji.flatMap(emoji => emoji.names);

class Owlmoji {
  static kind = name => {
    if (name in nameToEmoji) return 'gemoji';
    else if (name.match(/^fa-/)) return 'fontawesome';
    else if (owlmojiNames.includes(name)) return 'owlmoji';
    return null;
  };

  static nameToEmoji = nameToEmoji;

  static owlmoji = gemoji.concat(owlmoji).sort((a, b) => a.names[0] - b.names[0]);
}

module.exports = Owlmoji;
