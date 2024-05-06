const { gemoji, nameToEmoji } = require('gemoji');

const owlmoji = [
  {
    names: ['owlbert'],
    tags: ['owlbert'],
    description: 'an owlbert for any occasion',
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
    tags: ['owlbert'],
    description: 'owlbert with a respirator',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-reading'],
    tags: ['owlbert'],
    descritpion: 'owlbert reading',
    category: 'ReadMe',
  },
  {
    names: ['owlbert-thinking'],
    tags: ['owlbert'],
    description: 'owlbert thinking',
    category: 'ReadMe',
  },
];

const owlmojiNames = owlmoji.flatMap(emoji => emoji.names);

class Owlmoji {
  static kind = name => {
    if (name in nameToEmoji) return 'gemoji';
    else if (name.match(/^fa-/)) return 'fontawesome';
    else if (owlmojiNames.includes(name)) return 'owlmoji';

    return name.match(/-/) ? Owlmoji.kind(name.replaceAll(/-/g, '_')) : null;
  };

  static nameToEmoji = new Proxy(nameToEmoji, {
    get: (emojis, name) =>
      name in emojis ? emojis[name] : name.match(/-/) ? emojis[name.replaceAll(/-/g, '_')] : null,
  });

  static owlmoji = gemoji.concat(owlmoji).sort((a, b) => a.names[0] - b.names[0]);
}

module.exports = Owlmoji;
