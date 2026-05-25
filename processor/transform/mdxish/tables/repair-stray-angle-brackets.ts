import { maskNonTagRegions } from './tag-walker';
import { applyInserts, type Insert, type RepairResult } from './utils';

// mdxjs only begins a JSX/HTML construct when `<` is followed by a tag-name
// letter, a closing `/`, or `!` (comment/doctype). Anything else is a stray `<`.
const TAG_START = /[a-zA-Z/!]/;

/**
 * mdxjs treats every unescaped `<` as the start of a JSX tag and throws when it
 * isn't a well-formed one. Three shapes show up in cells:
 *  - a lone `<` followed by whitespace or end-of-cell (`hi <`),
 *  - an empty `<>` fragment opener (`hi <> there`),
 *  - an unterminated opener whose `>` never arrives (`hi <unclosed`), where
 *    htmlparser2 would otherwise swallow the cell's real `</td>` as the tag's
 *    terminator and mis-repair the table.
 * Any of these drops parsing for the whole surrounding `<Table>`, leaving the
 * cell as raw HTML.
 *
 * This pass escapes the offending `<` so it renders as literal text. Well-formed
 * tags — `<td>`, `</span>`, `<!-- … -->` — keep their `>` before the next `<`
 * and are left untouched. Masking shares `repairUnclosedTags`'s carve-outs (code
 * spans, legacy `<<var>>`, already-escaped `\<`), so those are never
 * double-escaped. Scoped to the malformed-retry path; the happy path never runs
 * it.
 */
export const repairStrayAngleBrackets = (html: string): RepairResult => {
  const masked = maskNonTagRegions(html);
  const inserts: Insert[] = [];

  for (let i = 0; i < masked.length; i += 1) {
    if (masked[i] === '<') {
      const next = masked[i + 1];
      if (next === undefined || !TAG_START.test(next)) {
        // A `<` that doesn't begin a tag at all (lone `<`, `<>` fragment).
        inserts.push({ offset: i, text: '\\' });
      } else if (next !== '!') {
        // A tag opener/closer must terminate with `>` before the next `<`;
        // otherwise it's unterminated. (Comments `<!…` close on `-->` and may
        // legitimately contain inner `<`, so they're left to the parser.)
        const gt = masked.indexOf('>', i + 1);
        const lt = masked.indexOf('<', i + 1);
        if (gt === -1 || (lt !== -1 && lt < gt)) {
          inserts.push({ offset: i, text: '\\' });
        }
      }
    }
  }

  return applyInserts(html, inserts);
};
