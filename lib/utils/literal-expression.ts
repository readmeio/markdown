import type { Expression, PrivateIdentifier, SpreadElement } from 'estree';

import { jsxAcornParser } from './jsx-acorn-parser';

const unsupported = (description: string) => new Error(`not a literal expression: ${description}`);

/** Narrows a resolved value for arithmetic, so operands never coerce to `NaN` or `"[object Object]"`. */
const asNumber = (value: unknown): number => {
  if (typeof value !== 'number') throw unsupported('non-numeric operand');
  return value;
};

const asOperand = (value: unknown): number | string => {
  if (typeof value !== 'number' && typeof value !== 'string') throw unsupported('non-primitive operand');
  return value;
};

const ARITHMETIC_OPERATORS: Record<string, (left: number | string, right: number | string) => number | string> = {
  // `+` doubles as string concatenation, so it accepts a string on either side.
  '+': (left, right) => (typeof left === 'number' && typeof right === 'number' ? left + right : `${left}${right}`),
  '-': (left, right) => asNumber(left) - asNumber(right),
  '*': (left, right) => asNumber(left) * asNumber(right),
  '/': (left, right) => asNumber(left) / asNumber(right),
};

/** Resolve one estree node, recursing into arrays and objects. Throws for anything not on the allowlist. */
const resolveNode = (node: Expression | PrivateIdentifier | SpreadElement): unknown => {
  switch (node.type) {
    case 'Literal':
      // Regex and bigint `Literal`s hold values a tree consumer can't serialise;
      // a BigInt throws outright in `JSON.stringify`.
      if ('regex' in node || 'bigint' in node) throw unsupported('regex or bigint literal');
      return node.value;
    case 'Identifier':
      if (node.name !== 'undefined') throw unsupported(`identifier \`${node.name}\``);
      return undefined;
    case 'TemplateLiteral':
      if (node.expressions.length) throw unsupported('template substitution');
      return node.quasis.map(quasi => quasi.value.cooked).join('');
    case 'UnaryExpression':
      if (node.operator !== '-') throw unsupported(`operator \`${node.operator}\``);
      return -asNumber(resolveNode(node.argument));
    case 'BinaryExpression': {
      const applyOperator = ARITHMETIC_OPERATORS[node.operator];
      if (!applyOperator) throw unsupported(`operator \`${node.operator}\``);
      return applyOperator(asOperand(resolveNode(node.left)), asOperand(resolveNode(node.right)));
    }
    case 'ArrayExpression':
      return node.elements.map(element => (element === null ? null : resolveNode(element)));
    case 'ObjectExpression':
      return node.properties.reduce<Record<string, unknown>>((memo, property) => {
        if (property.type !== 'Property' || property.computed) throw unsupported('computed or spread property');
        const { key } = property;
        if (key.type !== 'Identifier' && key.type !== 'Literal') throw unsupported('property key');
        const name = key.type === 'Identifier' ? key.name : String(key.value);
        // `__proto__` would replace the object's prototype rather than add a property.
        if (name === '__proto__') throw unsupported('`__proto__` key');
        memo[name] = resolveNode(property.value as Expression);
        return memo;
      }, {});
    default:
      throw unsupported(node.type);
  }
};

/**
 * Resolve a JSX attribute expression's source to its value without executing it.
 *
 * Supports the literal syntax attributes actually use — `true`, `"a"`, `` `a` ``,
 * `undefined`, `{ textAlign: "left" }`, `["left"]`, `1 + 1`, `'https://' + 'x.com'` —
 * and refuses everything else, so no identifier, member access, call, assignment or
 * function body can ever run. The trade-off is that expressions needing a scope or a
 * method call (`{item.url}`, `{"a".toUpperCase()}`) throw, and callers keep the raw
 * source instead — the same fallback they already used for an expression that threw.
 *
 * @param source expression body, without the surrounding braces
 * @throws if `source` is unparseable or isn't a supported literal expression
 */
export const evaluateLiteralExpression = (source: string): unknown => {
  const expression = jsxAcornParser.parseExpressionAt(source, 0, { ecmaVersion: 'latest' });
  // acorn stops at the first complete expression, so anything trailing means this isn't one.
  if (expression.end !== source.trimEnd().length) throw unsupported('trailing content');
  return resolveNode(expression as Expression);
};
