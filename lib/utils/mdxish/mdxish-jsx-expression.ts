import type { Program } from 'estree';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';

import { evaluate, jsxAcornParser } from '../../../processor/utils';

/** Matches a JSX element (`<Foo`) or fragment (`<>`) anywhere in an expression. */
export const HAS_JSX = /<[A-Za-z]|<>/;

/**
 * Clone-safe sentinel marking an attribute expression that contains JSX and so
 * must be evaluated *after* rehypeRaw's `structuredClone` passthrough — a built
 * JSX value is a React element (symbols inside) and would not survive the clone.
 * The plain `{ source }` shape clones fine, then `resolveJsxAttributeExpressionProps`
 * turns it into the real value once we're safely past the clone.
 */
const JSX_EXPR_SOURCE_KEY = '__mdxishJsxExprSource__';

interface JsxExprSentinel {
  [JSX_EXPR_SOURCE_KEY]: string;
}

export const createJsxExprSentinel = (source: string): JsxExprSentinel => ({ [JSX_EXPR_SOURCE_KEY]: source });

export const isJsxExprSentinel = (value: unknown): value is JsxExprSentinel =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)[JSX_EXPR_SOURCE_KEY] === 'string';

export const getJsxExprSource = (sentinel: JsxExprSentinel): string => sentinel[JSX_EXPR_SOURCE_KEY];

/**
 * The raw `Function()` evaluator can't parse JSX, so parse the expression,
 * convert its JSX to `React.createElement` calls, then evaluate the resulting
 * plain JavaScript. `scope` must provide `React`.
 */
export const evalJsxExpression = (expression: string, scope: Record<string, unknown>): unknown => {
  const program = jsxAcornParser.parse(expression, { ecmaVersion: 'latest', sourceType: 'module' }) as Program;
  buildJsx(program, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' });
  const { value: source } = toJs(program);
  return evaluate(`(() => { return ${source.trim().replace(/;$/, '')}; })()`, scope);
};

/** Evaluate an expression body, transforming JSX to `React.createElement` only when needed. */
export const evalExpression = (expression: string, scope: Record<string, unknown>): unknown => {
  if (HAS_JSX.test(expression)) return evalJsxExpression(expression, scope);
  return evaluate(expression, scope);
};
