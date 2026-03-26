import type { Code, Effects, State } from 'micromark-util-types';

import { codes } from 'micromark-util-symbol';

export const IMAGE_SUFFIX: Code[] = [codes.lowercaseM, codes.lowercaseA, codes.lowercaseG, codes.lowercaseE];
export const IMG_SUFFIX: Code[] = [codes.lowercaseM, codes.lowercaseG];
export const CALLOUT_SUFFIX: Code[] = [
  codes.lowercaseA,
  codes.lowercaseL,
  codes.lowercaseL,
  codes.lowercaseO,
  codes.lowercaseU,
  codes.lowercaseT,
];
export const EMBED_SUFFIX: Code[] = [codes.lowercaseM, codes.lowercaseB, codes.lowercaseE, codes.lowercaseD];
export const RECIPE_SUFFIX: Code[] = [
  codes.lowercaseE,
  codes.lowercaseC,
  codes.lowercaseI,
  codes.lowercaseP,
  codes.lowercaseE,
];
export const ANCHOR_SUFFIX: Code[] = [
  codes.lowercaseN,
  codes.lowercaseC,
  codes.lowercaseH,
  codes.lowercaseO,
  codes.lowercaseR,
];

/**
 * Look up the suffix for a known tag given its first character code.
 * Returns undefined if the character doesn't start any known tag.
 *
 * `I` and `i` both start known names but are unambiguous because `I` → Image
 * (uppercase) and `i` → img (lowercase) never conflict.
 */
/**
 * Build a state chain that matches a sequence of character codes.
 * On match calls onMatch; on any mismatch calls nok.
 */
export function matchSequence(
  chars: Code[],
  idx: number,
  tagName: Code[],
  effects: Effects,
  onMatch: State,
  nok: State,
): State {
  if (idx >= chars.length) return onMatch;
  return ((code: Code): State | undefined => {
    if (code === chars[idx]) {
      tagName.push(code);
      effects.consume(code);
      return matchSequence(chars, idx + 1, tagName, effects, onMatch, nok);
    }
    return nok(code);
  }) as State;
}

export function suffixForFirstChar(code: Code): Code[] | undefined {
  switch (code) {
    case codes.uppercaseI:
      return IMAGE_SUFFIX;
    case codes.lowercaseI:
      return IMG_SUFFIX;
    case codes.uppercaseC:
      return CALLOUT_SUFFIX;
    case codes.uppercaseE:
      return EMBED_SUFFIX;
    case codes.uppercaseR:
      return RECIPE_SUFFIX;
    case codes.uppercaseA:
      return ANCHOR_SUFFIX;
    default:
      return undefined;
  }
}
