const { nameToEmoji } = require('gemoji');

const owlmoji = ['owlbert-books', 'owlbert-mask', 'owlbert', 'owlbert-reading', 'owlbert-thinking'];

class Emoji {
  static kind = name => {
    if (name in nameToEmoji) return 'gemoji';
    else if (name.match(/^fa-/)) return 'fontawesome';
    else if (owlmoji.includes(name)) return 'owlmoji';
    return null;
  };

  static nameToEmoji = nameToEmoji;
}

module.exports = Emoji;
