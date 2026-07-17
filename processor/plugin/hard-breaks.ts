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
  findAndReplace(tree, [/\r?\n/g, () => ({ type: 'break' })]);
};

export default hardBreaks;
