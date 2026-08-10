import { MDX_VARIABLE_REGEXP } from '@readme/variable';

// The `$` guard skips template-literal interpolation: `${user.name}` embeds `{user.name}`, and
// substituting it would leave a mangled `` `Hi $Name` `` behind. Those belong to an expression,
// which either evaluated already or is meant to stay literal.
const MDX_VARIABLE_REGEX = new RegExp(`(?<!\\$)${MDX_VARIABLE_REGEXP}`, 'gu');

// Bracket notation names the same variable as dot notation, so normalize it before substituting.
const BRACKET_NOTATION_REGEX = /\{user\[['"](\w+)['"]\]\}/gu;

/**
 * Resolve `{user.*}` in a JSX attribute value against the same `user` binding the rmdx engine gets,
 * so both engines agree. Body text differs on empty values: `Variable` falls back to the default.
 *
 * Legacy `<<...>>` is valid inside a quoted attribute but deliberately left literal — attributes are
 * an MDX surface, and `{user.*}` is the syntax authors use there.
 */
export function resolveAttributeVariables(value: string, user: Record<string, string>): string {
  if (!value.includes('{user')) return value;

  return value
    .replace(BRACKET_NOTATION_REGEX, '{user.$1}')
    .replace(MDX_VARIABLE_REGEX, (source, escapePrefix: string, name: string, escapeSuffix: string) => {
      if (escapePrefix || escapeSuffix) return source;
      return user[name];
    });
}
