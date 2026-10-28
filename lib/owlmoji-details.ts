import { gemoji } from 'gemoji';

import { owlmoji } from './owlmoji';

/**
 * Every gemoji plus ReadMe's owlmoji, with tags and descriptions, for emoji pickers. Lives at
 * `@readme/markdown/owlmoji-details` so the main entry only ships the `Owlmoji.nameToEmoji` lookup.
 */
export const owlmojiDetails = gemoji.concat(owlmoji);
