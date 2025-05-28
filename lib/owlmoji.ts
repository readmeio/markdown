import type { Gemoji } from 'gemoji';

import { gemoji, nameToEmoji } from 'gemoji';

export const owlmoji = [
  {
    emoji: '', // This `emoji` property doesn't get consumed, but is required for type consistency
    names: ['owlbert'],
    tags: ['owlbert'],
    description: 'an owlbert for any occasion',
    category: 'ReadMe',
  },
  {
    emoji: '',
    names: ['owlbert-books'],
    tags: ['owlbert'],
    description: 'owlbert carrying books',
    category: 'ReadMe',
  },
  {
    emoji: '',
    names: ['owlbert-mask'],
    tags: ['owlbert'],
    description: 'owlbert with a respirator',
    category: 'ReadMe',
  },
  {
    emoji: '',
    names: ['owlbert-reading'],
    tags: ['owlbert'],
    description: 'owlbert reading',
    category: 'ReadMe',
  },
  {
    emoji: '',
    names: ['owlbert-thinking'],
    tags: ['owlbert'],
    description: 'owlbert thinking',
    category: 'ReadMe',
  },
] satisfies Gemoji[];

const owlmojiNames = owlmoji.flatMap(emoji => emoji.names);

export default class Owlmoji {
  static kind = (name: string) => {
    if (name in nameToEmoji) return 'gemoji';
    else if (name.match(/^fa-/)) return 'fontawesome';
    else if (owlmojiNames.includes(name)) return 'owlmoji';
    return null;
  };

  static nameToEmoji = nameToEmoji;

  static owlmoji = gemoji.concat(owlmoji).sort((a, b) => a.names[0].localeCompare(b.names[0]));
}
