import { jsxAcornParser } from '../../../utils';

import { applyInserts, type Insert, type RepairResult } from './utils';

/**
 * Returns true if `content` is something mdxjs would accept between `{…}`.
 *
 * mdxjs hands the contents of every `{…}` to acorn as a JavaScript expression,
 * so we validate the same way. Empty/whitespace-only content is allowed (MDX
 * treats `{}` as an empty expression); anything else must parse as a single JS
 * expression. The parens make a bare object literal (`{ a: 1 }`) parse as an
 * expression instead of a block statement, mirroring mdxjs.
 */
const isParsableExpression = (content: string): boolean => {
  if (content.trim() === '') return true;
  try {
    jsxAcornParser.parse(`(${content})`, { ecmaVersion: 'latest' });
    return true;
  } catch {
    return false;
  }
};

/**
 * mdxjs treats every unescaped `{` as the start of a JavaScript expression and
 * throws when the contents don't parse — an unterminated `{` (e.g. `hi { gwr`)
 * or a balanced-but-invalid one (e.g. `{/}`). Either drops parsing for the whole
 * surrounding `<Table>`, leaving the cell as raw HTML.
 *
 * This pass escapes the opening `{` of any top-level `{…}` region that mdxjs
 * could not parse, so it is rendered as literal text instead. Valid expressions
 * — including JSX attribute values like `align={["left"]}` — parse cleanly and
 * are left untouched. Scoped to the malformed-retry path; the happy path never
 * runs it.
 */
export const repairBrokenExpressions = (html: string): RepairResult => {
  const inserts: Insert[] = [];
  // Active string/template delimiter while scanning inside an expression, or null.
  let stringChar: string | null = null;
  let depth = 0;
  // Offset of the currently open top-level `{`, or -1 when at depth 0.
  let exprStart = -1;

  // True when the `{`/`}` at index `i` is escaped by an odd run of backslashes,
  // in which case mdxjs treats it as a literal brace, not expression syntax.
  const isEscaped = (i: number): boolean => {
    let backslashes = 0;
    for (let j = i - 1; j >= 0 && html[j] === '\\'; j -= 1) backslashes += 1;
    return backslashes % 2 === 1;
  };

  for (let i = 0; i < html.length; i += 1) {
    const ch = html[i];

    if (stringChar) {
      // Inside a JS string/template literal: a backslash escapes the next char,
      // so skip the pair (also stops an escaped quote from closing the literal).
      if (ch === '\\') i += 1;
      else if (ch === stringChar) stringChar = null;
    } else if (depth > 0 && (ch === '"' || ch === "'" || ch === '`')) {
      stringChar = ch;
    } else if (ch === '{' && !isEscaped(i)) {
      if (depth === 0) exprStart = i;
      depth += 1;
    } else if (ch === '}' && !isEscaped(i) && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        if (!isParsableExpression(html.slice(exprStart + 1, i))) {
          inserts.push({ offset: exprStart, text: '\\', consumes: 0 });
        }
        exprStart = -1;
      }
    }
  }

  // An unterminated `{` (depth never returned to 0) is itself invalid.
  if (depth > 0 && exprStart >= 0) {
    inserts.push({ offset: exprStart, text: '\\', consumes: 0 });
  }

  return applyInserts(html, inserts);
};
