import type { Variables } from '../../../types';

import { MDX_VARIABLE_REGEXP } from '@readme/variable';

// The `$` guard skips template-literal interpolation: `${user.name}` embeds `{user.name}`, and
// substituting it would leave a mangled `` `Hi $Name` `` behind. Those belong to an expression,
// which either evaluated already or is meant to stay literal.
const MDX_VARIABLE_REGEX = new RegExp(`(?<!\\$)${MDX_VARIABLE_REGEXP}`, 'giu');

/** Merge `defaults` and `user` into a single lookup, with user values taking precedence. */
export function flattenVariables(variables?: Variables): Record<string, string> {
  if (!variables) return {};

  return {
    ...Object.fromEntries((variables.defaults || []).map(({ name, default: value }) => [name, value])),
    ...variables.user,
  };
}

/**
 * Resolve `{user.*}` in a JSX attribute value, matching how the `Variable` component resolves it in
 * body text: user value, then project default, then the uppercased name.
 *
 * Legacy `<<...>>` is deliberately not handled — attributes only exist on MDX components, which use
 * the `{user.*}` syntax.
 */
export function resolveAttributeVariables(value: string, resolvedVariables: Record<string, string>): string {
  if (!value.includes('{user')) return value;

  return value.replace(MDX_VARIABLE_REGEX, (source, escapePrefix: string, name: string, escapeSuffix: string) => {
    if (escapePrefix || escapeSuffix) return source;
    return resolvedVariables[name] ?? name.toUpperCase();
  });
}
