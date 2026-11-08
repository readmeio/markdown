import type { Root } from 'mdast';
import type { Plugin } from 'unified';

import { findAndReplace } from 'mdast-util-find-and-replace';

/**
 * Converts LF and CRLF line endings into hard breaks while leaving standalone
 * carriage returns as soft whitespace.
 *
 * Unlike `remark-breaks`, this does not promote a lone `\r` into a `<br>`.
 * Standalone carriage returns can be left behind by generators that replace
 * the LF in Windows line endings with an explicit `<br>`, producing input such
 * as `\r<br>`. Treating both characters as hard breaks doubles the spacing.
 */
const hardBreaks: Plugin<[], Root> = () => tree => {
  // Skip `html-block`: its opaque payload is rendered verbatim, so turning its newlines
  // into `break` nodes is unnecessary and costly on large blocks.
  findAndReplace(tree, [/\r?\n/g, () => ({ type: 'break' })], { ignore: ['html-block'] });
};

export default hardBreaks;
