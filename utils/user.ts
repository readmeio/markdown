interface Default {
  default: string;
  name: string;
}

export interface Variables {
  defaults: Default[];
  user: Record<string, unknown>;
}

/**
 * Coerce a user variable value to a string for substitution into markdown text.
 * Non-string values (arrays, objects, numbers) are stringified via JSON or `String()`
 * so that `<<var>>` syntax doesn't produce `[object Object]` for structured data like
 * JWT `keys`.
 */
const stringifyVariableValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value) ?? '';
  return String(value);
};

/**
 * Flatten `variables.user` into a string-keyed string-valued record by coercing
 * each value. Used by markdown substitution paths that need a plain
 * `Record<string, string>` lookup.
 */
export const flattenUserVariables = (user: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(user).map(([name, value]) => [name, stringifyVariableValue(value)]));

const User = (variables?: Variables) => {
  const { user = {}, defaults = [] } = variables || {};

  return new Proxy(user, {
    get(target, attribute) {
      if (typeof attribute === 'symbol') {
        return '';
      }

      if (attribute in target) {
        return target[attribute];
      }

      const def = defaults.find((d: Default) => d.name === attribute);

      return def ? def.default : attribute.toUpperCase();
    },
  });
};

export default User;
