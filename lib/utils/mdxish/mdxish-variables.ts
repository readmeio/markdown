import type { Variables } from '../../../types';

import { MDX_VARIABLE_REGEXP, VARIABLE_REGEXP } from '@readme/variable';

// Single combined regex so that resolved values from one pattern are never re-scanned by the other.
const COMBINED_VARIABLE_REGEX = new RegExp(`${VARIABLE_REGEXP}|${MDX_VARIABLE_REGEXP}`, 'giu');

export interface VariableMatch {
  /** `true` for `{user.foo}`, `false` for legacy `<<foo>>`. */
  isMdxSyntax: boolean;
  name: string;
  /** The matched source, e.g. `<<foo>>` or `{user.foo}`. */
  source: string;
}

/** Merge `defaults` and `user` into a single lookup, with user values taking precedence. */
export function flattenVariables(variables?: Variables): Record<string, string> {
  if (!variables) return {};

  return {
    ...Object.fromEntries((variables.defaults || []).map(({ name, default: value }) => [name, value])),
    ...variables.user,
  };
}

/** Returns false for strings that cannot contain either variable syntax, to skip the regex. */
export function mayContainVariable(value: string): boolean {
  return value.includes('<<') || value.includes('{user');
}

/**
 * Replace every unescaped variable in `value`, delegating each match to `resolveMatch`.
 * Callers own the unresolved-variable fallback, which differs by context.
 */
export function replaceVariables(value: string, resolveMatch: (variable: VariableMatch) => string): string {
  return value.replace(
    COMBINED_VARIABLE_REGEX,
    (source: string, legacyName: string, mdxEscapePrefix: string, mdxName: string, mdxEscapeSuffix: string) => {
      if (legacyName !== undefined) {
        if (source.startsWith('\\<<') || source.endsWith('\\>>')) return source;
        return resolveMatch({ isMdxSyntax: false, name: legacyName.trim(), source });
      }

      if (mdxEscapePrefix || mdxEscapeSuffix) return source;
      return resolveMatch({ isMdxSyntax: true, name: mdxName, source });
    },
  );
}

/**
 * Resolve variables in a JSX attribute value, matching how the `Variable` component resolves
 * them in body text: user value, then project default, then the uppercased name.
 */
export function resolveAttributeVariables(value: string, resolvedVariables: Record<string, string>): string {
  if (!mayContainVariable(value)) return value;

  return replaceVariables(value, ({ name }) => resolvedVariables[name] ?? name.toUpperCase());
}
