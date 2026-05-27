import { applyInserts, type Insert, type RepairResult } from './utils';

/**
 * mdxjs hands the contents of every `{…}` to acorn as a JavaScript expression.
 * A bare backslash is only legal inside a string/template literal in JS, so a
 * markdown-style escape such as `{customer\_id}` — common when authors escape an
 * underscore out of habit — makes acorn throw "Could not parse expression with
 * acorn", which drops parsing for the whole surrounding `<Table>`.
 *
 * This pass deletes backslashes that sit in JS *code* position inside a `{…}`
 * expression. Backslashes within a '…', "…" or `…` literal are valid escapes
 * and are left untouched. Scoped to the malformed-retry path; the happy path
 * never runs it.
 */
export const repairExpressionEscapes = (html: string): RepairResult => {
  const inserts: Insert[] = [];
  let braceDepth = 0;
  // Active string/template delimiter while scanning inside an expression, or null.
  let stringChar: string | null = null;

  for (let i = 0; i < html.length; i += 1) {
    const ch = html[i];

    if (stringChar) {
      // Inside a JS string/template literal a backslash escapes the next char
      // and is valid, so skip the pair untouched (this also prevents an escaped
      // quote from prematurely closing the literal).
      if (ch === '\\') {
        i += 1;
      } else if (ch === stringChar) {
        stringChar = null;
      }
    } else if (braceDepth > 0 && (ch === '"' || ch === "'" || ch === '`')) {
      stringChar = ch;
    } else if (ch === '{') {
      braceDepth += 1;
    } else if (ch === '}') {
      if (braceDepth > 0) braceDepth -= 1;
    } else if (braceDepth > 0 && ch === '\\') {
      // A backslash in code position inside an expression is always a syntax
      // error; delete it so acorn can parse the remaining expression.
      inserts.push({ offset: i, text: '', consumes: 1 });
    }
  }

  return applyInserts(html, inserts);
};
