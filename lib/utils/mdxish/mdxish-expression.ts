import type { Program } from 'estree';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';

import { evaluate, jsxAcornParser } from '../../../processor/utils';

const parseExpression = (expression: string): Program =>
  jsxAcornParser.parse(expression, { ecmaVersion: 'latest', sourceType: 'module' }) as Program;

/**
 * Recursively report whether an estree value contains any JSX element or fragment node.
 * estree stores children across named fields (not a `children` array), so this descends
 * through every nested object/array rather than using a unist-shaped walker.
 */
const containsJsxNode = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsJsxNode);
  if (value === null || typeof value !== 'object') return false;
  const { type } = value as { type?: unknown };
  if (type === 'JSXElement' || type === 'JSXFragment') return true;
  return Object.values(value).some(containsJsxNode);
};

/** Read the component name off a JSX element name node (`Foo`, `Foo.Bar`, `foo:Bar`). */
const jsxElementName = (name: unknown): string | undefined => {
  if (name === null || typeof name !== 'object') return undefined;
  const node = name as { name?: unknown; namespace?: unknown; object?: unknown; type?: string };

  if (node.type === 'JSXIdentifier') return typeof node.name === 'string' ? node.name : undefined;
  // `<Foo.Bar/>` and `<foo:Bar/>` resolve through their leftmost part.
  if (node.type === 'JSXMemberExpression') return jsxElementName(node.object);
  if (node.type === 'JSXNamespacedName') return jsxElementName(node.namespace);
  return undefined;
};

/**
 * Collect the capitalized names an expression uses as JSX tags. Parsed rather than pattern
 * matched: `{count < Max ? <Foo/> : <Bar/>}` puts a capitalized name straight after a `<` without
 * it being a tag, and only the parser can tell the two apart. Unparseable input yields nothing —
 * evaluation is about to throw on it anyway.
 */
export const jsxComponentNames = (expression: string): string[] => {
  let program: Program;
  try {
    program = parseExpression(expression);
  } catch {
    return [];
  }

  const names = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value === null || typeof value !== 'object') return;

    const node = value as { name?: unknown; type?: string };
    if (node.type === 'JSXOpeningElement') {
      const name = jsxElementName(node.name);
      // Lowercase tags compile to a string type, never a variable reference.
      if (name && /^[A-Z]/.test(name)) names.add(name);
    }

    Object.values(node).forEach(walk);
  };

  walk(program);
  return Array.from(names);
};

/** Convert a program's JSX into `React.createElement` calls and evaluate it. `scope` must provide `React`. */
const evalJsxProgram = (program: Program, scope: Record<string, unknown>) => {
  buildJsx(program, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' });
  const { value: source } = toJs(program);
  return evaluate(`(() => { return ${source.trim().replace(/;$/, '')}; })()`, scope);
};

/**
 * Evaluate an expression body, transforming JSX to `React.createElement` only when the
 * parsed estree actually contains a JSX node. The raw `Function()` evaluator can't parse
 * JSX, so JSX-bearing expressions take the build-and-serialize path while everything else
 * evaluates directly. Input acorn can't parse falls back to the plain evaluator unchanged.
 */
export const evalExpression = (expression: string, scope: Record<string, unknown>) => {
  let program: Program;
  try {
    program = parseExpression(expression);
  } catch {
    return evaluate(expression, scope);
  }
  if (!containsJsxNode(program)) return evaluate(expression, scope);
  return evalJsxProgram(program, scope);
};
