import type { Program } from 'estree';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';
import { CONTINUE, EXIT, visit } from 'estree-util-visit';

import { evaluate, jsxAcornParser } from '../../../processor/utils';

const parseExpression = (expression: string): Program =>
  jsxAcornParser.parse(expression, { ecmaVersion: 'latest', sourceType: 'module' }) as Program;

/** Walk the parsed program and report whether it contains any JSX element or fragment node. */
const containsJsxNode = (program: Program) => {
  let hasJsx = false;
  visit(program, node => {
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      hasJsx = true;
      return EXIT;
    }
    return CONTINUE;
  });
  return hasJsx;
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
