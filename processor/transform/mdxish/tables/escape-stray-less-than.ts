import { maskNonTagRegions } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

// A `<` only starts a JSX/HTML construct when followed by a tag-name start
// (letter, `_`, `$`), a closer `/`, a fragment `>`, or a comment/declaration
// `!`. Anything else (whitespace, EOL, a digit, …) is a literal `<` that acorn
// rejects with "before name, expected a character that can start a name".
const STRAY_LESS_THAN_RE = /<(?![a-zA-Z_$/>!])/g;

/**
 * Escapes stray `<` characters that don't begin a valid tag so the strict mdxjs
 * parse treats them as literal text instead of throwing (`word <`, `a <1>`).
 *
 * Runs against the masked source so `<` inside code spans, legacy `<<var>>`
 * syntax, or already-escaped `\<` are left untouched.
 */
export const escapeStrayLessThan = (html: string): RepairResult => {
  const masked = maskNonTagRegions(html);
  const inserts: Insert[] = [];

  STRAY_LESS_THAN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STRAY_LESS_THAN_RE.exec(masked)) !== null) {
    inserts.push({ offset: match.index, text: '\\' });
  }

  return applyInserts(html, inserts);
};
