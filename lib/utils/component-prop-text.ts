import type { ExpressionStatement, Program, SimpleLiteral, TemplateLiteral } from 'estree';

import { CSS_STYLE_PROP_NAMES } from '../../utils/common-html-words';

import { jsxAcornParser } from './jsx-acorn-parser';

/**
 * Value shapes that are styling/config rather than authored copy. Styling props are already
 * skipped by name (see `CSS_STYLE_PROP_NAMES`); this catches custom-named props the name list
 * can't know about, e.g. `buttonColor="#0B1440"` or `link="https://…"`.
 */
const CONFIG_VALUE_PATTERNS = [
  /^#[0-9a-f]{3,8}$/i, // hex color
  /^(?:rgb|rgba|hsl|hsla|var|calc|url)\(/i, // CSS function
  /^-?\d*\.?\d+(?:px|em|rem|%|vh|vw|pt|fr|deg|s|ms)?$/i, // number / dimension
  /^(?:https?:)?\/\//i, // URL
  /^(?:true|false)$/i, // boolean
];

/**
 * Text inside a JSX attribute expression that safeMode kept literal, e.g. `content={`Hi`}`.
 * Only a static string or uninterpolated template literal returns text; `{true}`, `{5}`,
 * `{user.name}`, interpolated templates, and JSX return undefined.
 */
function staticExpressionText(value: string): string | undefined {
  if (!value.startsWith('{') || !value.endsWith('}')) return undefined;

  let program: Program;
  try {
    program = jsxAcornParser.parse(value.slice(1, -1), {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }) as unknown as Program;
  } catch {
    return undefined;
  }

  if (program.body.length !== 1 || program.body[0].type !== 'ExpressionStatement') return undefined;
  const expr = (program.body[0] as ExpressionStatement).expression;

  if (expr.type === 'Literal') {
    return typeof (expr as SimpleLiteral).value === 'string' ? ((expr as SimpleLiteral).value as string) : undefined;
  }
  if (expr.type === 'TemplateLiteral' && (expr as TemplateLiteral).expressions.length === 0) {
    return (expr as TemplateLiteral).quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw).join('');
  }
  return undefined;
}

/** Authored copy from a single prop, or undefined when it's styling, config, or a non-static expression. */
function propCopy(name: string, value: unknown): string | undefined {
  if (typeof value !== 'string' || CSS_STYLE_PROP_NAMES.has(name)) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('{')) return staticExpressionText(trimmed)?.trim() || undefined;
  return CONFIG_VALUE_PATTERNS.some(re => re.test(trimmed)) ? undefined : trimmed;
}

/**
 * Authored copy in a custom component's props, e.g. the `message` in `<Banner message="…" />` or
 * `content={`…`}`. In safeMode the component never renders, so this text survives only on the
 * node's props — without pulling it out here it's dropped from search. Mirrors how built-in
 * components index their text props (a Callout's `title`) but not their styling config.
 */
export function componentPropText(node: { properties?: Record<string, unknown> | null }): string {
  if (!node.properties) return '';

  return Object.entries(node.properties)
    .map(([name, value]) => propCopy(name, value))
    .filter((copy): copy is string => Boolean(copy))
    .join(' ');
}
