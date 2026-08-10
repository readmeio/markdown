import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { hast, mdast } from '../../../lib';
import { evaluateLiteralExpression } from '../../../lib/utils/literal-expression';

/** An executed attribute expression sets this; it must stay `false` in every case below. */
const canaryScope = globalThis as typeof globalThis & { attributeCanary?: boolean };
const CANARY_DOC = '<Callout icon={(globalThis.attributeCanary = true)} />';

describe('evaluateLiteralExpression', () => {
  it.each([
    ['true', true],
    ['null', null],
    ['undefined', undefined],
    ['1', 1],
    ['-1', -1],
    ['"double"', 'double'],
    ["'single'", 'single'],
    ['`backtick`', 'backtick'],
    ['1 + 1', 2],
    ["'https://' + 'example.com' + '/x'", 'https://example.com/x'],
    ["'page-' + 2", 'page-2'],
    ['[]', []],
    ['["left","right"]', ['left', 'right']],
    ['[null,"center",null]', [null, 'center', null]],
    ['{}', {}],
    // Unquoted keys and single quotes are the common forms `JSON.parse` can't take.
    ['{ textAlign: "left" }', { textAlign: 'left' }],
    ["{ color: 'red' }", { color: 'red' }],
    ['{ a: { b: [1, "two"] } }', { a: { b: [1, 'two'] } }],
  ])('resolves %s', (source, expected) => {
    expect(evaluateLiteralExpression(source)).toStrictEqual(expected);
  });

  it.each([
    ['a binding', 'item.url'],
    ['a bare identifier', 'x'],
    ['a method call', '"hi".toUpperCase()'],
    ['a require', 'require("fs")'],
    ['an assignment', 'globalThis.attributeCanary = true'],
    ['a function', '() => globalThis.attributeCanary'],
    // eslint-disable-next-line no-template-curly-in-string -- attribute source, not a JS template
    ['a template substitution', '`a${b}`'],
    ['a spread', '{ ...spread }'],
    ['a computed key', '{ [key]: 1 }'],
    ['a regex', '/re/g'],
    ['a bigint, which cannot be serialised', '1n'],
    ['arithmetic on a string', "'a' - 1"],
    ['arithmetic on an object', '{} + 1'],
    ['a negated string', '-"abc"'],
    ['a prototype-replacing key', '{ __proto__: { admin: true } }'],
    ['an exponent, which can hang the process', '2 ** 1e9'],
    // acorn stops at the first expression, so trailing source could smuggle in a second one.
    ['trailing source', '1, globalThis.attributeCanary = true'],
  ])('refuses %s', (_description, source) => {
    expect(() => evaluateLiteralExpression(source)).toThrow('not a literal expression');
  });
});

describe('attribute expressions are never executed', () => {
  it.each([
    ['mdast', () => mdast(CANARY_DOC)],
    ['hast', () => hast(CANARY_DOC)],
    ['a component definition', () => hast('<Foo />', { components: { Foo: CANARY_DOC } })],
    ['a component definition checked for missing components', () =>
      mdast('hi', { components: { Foo: CANARY_DOC }, missingComponents: 'ignore' })],
    ['an Image caption, which is re-parsed', () =>
      mdast(`<Image src="/x.png" caption="${CANARY_DOC.replace(/"/g, '')}" />`)],
  ])('in %s', (_description, parse) => {
    canaryScope.attributeCanary = false;
    parse();

    expect(canaryScope.attributeCanary).toBe(false);
  });
});

describe('host access and command execution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['reads an environment variable', 'process.env.CANARY_SECRET'],
    ['reaches the environment through globalThis', 'globalThis.process.env.CANARY_SECRET'],
    ['loads a built-in module', 'process.getBuiltinModule("child_process")'],
    ['imports a module dynamically', 'import("node:fs")'],
    // The classic sandbox escape: `constructor.constructor` is the `Function` constructor.
    ['escapes through a constructor', '"".constructor.constructor("return process.env")()'],
  ])('refuses an expression that %s', (_description, source) => {
    expect(() => evaluateLiteralExpression(source)).toThrow('not a literal expression');
  });

  it('does not leak an environment variable into the tree', () => {
    vi.stubEnv('CANARY_SECRET', 'canary-secret-value');
    const tree = JSON.stringify(mdast('<Callout icon={process.env.CANARY_SECRET} />'));

    expect(tree).not.toContain('canary-secret-value');
    expect(tree).toContain('process.env.CANARY_SECRET');
  });

  it('does not run a shell command', () => {
    const marker = join(tmpdir(), 'rdmd-command-execution-canary');
    rmSync(marker, { force: true });
    mdast(`<Callout icon={process.getBuiltinModule("child_process").execSync("touch ${marker}")} />`);

    expect(existsSync(marker)).toBe(false);
  });
});
