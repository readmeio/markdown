import { MDX_VARIABLE_REGEXP, VARIABLE_REGEXP } from '@readme/variable';

import { stringifyVariableValue } from '../../../utils/user';

// The `$` guard skips template-literal interpolation: `${user.name}` embeds `{user.name}`, and
// substituting it would leave a mangled `` `Hi $Name` `` behind. Those belong to an expression,
// which either evaluated already or is meant to stay literal.
const MDX_VARIABLE_REGEX = new RegExp(`(?<!\\$)${MDX_VARIABLE_REGEXP}`, 'gu');

// Bracket notation names the same variable as dot notation, so normalize it before substituting.
// Escaped and `$`-prefixed forms are left alone so a reference that stays literal keeps its source.
// A closing escape needs no lookahead: requiring a literal `]}` already rules out `]\}`.
const BRACKET_NOTATION_REGEX = /(?<![$\\])\{user\[['"](\w+)['"]\]\}/gu;

const ALT_VARIABLE_REGEX = new RegExp(`${MDX_VARIABLE_REGEX.source}|${VARIABLE_REGEXP}`, 'gu');

/**
 * Resolve `{user.*}` in a JSX attribute value against the same `user` binding the rmdx engine gets,
 * so both engines agree. Body text differs on empty values: `Variable` falls back to the default.
 *
 * Legacy `<<...>>` is valid inside a quoted attribute but deliberately left literal — attributes are
 * an MDX surface, and `{user.*}` is the syntax authors use there. Image alt is the exception, resolved
 * in the same pass so a substituted value is never rescanned (RM-10865).
 */
export function resolveAttributeVariables(value: string, user: Record<string, unknown>, isImageAlt = false): string {
  if (!isImageAlt && !value.includes('{user')) return value;

  return value
    .replace(BRACKET_NOTATION_REGEX, '{user.$1}')
    .replace(
      isImageAlt ? ALT_VARIABLE_REGEX : MDX_VARIABLE_REGEX,
      (source, _prefix?: string, name?: string, _suffix?: string, legacyName?: string) => {
        // Variable names can't contain a backslash, so one marks an escaped reference.
        if (source.includes('\\')) return isImageAlt ? source.replaceAll('\\', '') : source;
        const key = (name ?? legacyName!).trim();
        if (key.startsWith('glossary:')) return key.slice('glossary:'.length).trim();
        return stringifyVariableValue(user[key]);
      },
    );
}
