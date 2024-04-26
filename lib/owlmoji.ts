import { nameToEmoji } from 'gemoji';

const owlmoji = ['owlbert-books', 'owlbert-mask', 'owlbert', 'owlbert-reading', 'owlbert-thinking'];

export default class Owlmoji {
  static kind = (name: string) => {
    if (name in nameToEmoji) return 'gemoji';
    else if (name.match(/^fa-/)) return 'fontawesome';
    else if (owlmoji.includes(name)) return 'owlmoji';
    return null;
  };

  static nameToEmoji = nameToEmoji;
}
