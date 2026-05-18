import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, it, expect } from 'vitest';

import { mdxish, mix, renderMdxish } from '../../../lib';
import { findElementByTagName } from '../../helpers';

describe('MDX variable and function declarations in MDXish', () => {
  it('throws on malformed export bodies', () => {
    // `export const x =;` is syntactically invalid
    const md = 'export const x =;\n\nHello world.';
    expect(() => mdxish(md)).toThrow(/unexpected|parse|syntax/i);
  });

  it('removes export declarations from the rendered output', () => {
    const md = 'export const foo = "hello";\n\nBody text.';
    const html = mix(md);

    expect(html).not.toContain('export const');
  });


  describe('when exports are not supposed to be evaluated', () => {
    it('does not evaluate exports when safeMode is enabled and keeps them as literal text', () => {
      const md = 'export const foo = "hello";\n\nValue: {foo}.';
      const html = mix(md, { safeMode: true });
      expect(html).toContain('export const foo = "hello";');
      expect(html).toContain('Value: {foo}.');
    });

    it('does not treat prose starting with "Export"/"Import" as ESM exports', () => {
      const md = 'Export your data by clicking save.\n\nImport the file first.';
      const html = mix(md);
      expect(html).toContain('Export your data');
      expect(html).toContain('Import the file');
    });
  });

  describe('variable declarations', () => {
    it('resolves `export const` values inside `{...}` expressions', () => {
      const md = 'export const foo = "hello";\n\nHi {foo}.';
      const html = mix(md);

      expect(html).toContain('Hi hello.');
    });

    it('resolves multiple variable declarations in the same line', () => {
      const md = 'export const a = 1, b = 2, c = 3;\n\nNumbers: {a} {b} {c}';
      const html = mix(md);
      expect(html).toContain('Numbers: 1 2 3');
    });

    it('resolves mixed types of variable declarations in the same line', () => {
      const md = 'export const a = 1, b = "hello", c = true;\n\nNumbers: {a} Strings: {b} Booleans: {c}';
      const html = mix(md);
      expect(html).toContain('Numbers: 1 Strings: hello Booleans: true');
    });
  });

  describe('function declarations', () => {
    it('makes `export function` declarations available as JSX components', () => {
      const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
      const ast = mdxish(md);

      const el = findElementByTagName(ast,'Greeting');
      expect(el).toBeDefined();
    });

    it('renders `export function` components to their JSX body', () => {
      const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
      const ast = mdxish(md);
      const { default: Content } = renderMdxish(ast);

      const html = renderToStaticMarkup(Content ? React.createElement(Content) : null);
      expect(html).toContain('Hey Ho');
      expect(html).toContain('<div>Hey Ho</div>');
    });

    // Classification policy: `evaluate-esm` inspects each export's declaration
    // AST and routes it based on whether the body contains JSX:
    // - JSX-bearing functions  → scope.components (callable as <Component />)
    // - Everything else        → scope.values     (callable from {...} exprs)
    describe('classification of function exports', () => {
      it('routes JSX-returning functions to scope.components', () => {
        const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
        const tree = mdxish(md);
        expect(Object.keys(tree.data?.mdxishScope?.components ?? {})).toContain('Greeting');
        expect(Object.keys(tree.data?.mdxishScope?.values ?? {})).not.toContain('Greeting');
      });

      it('routes value-returning functions to scope.values', () => {
        // `add` has no JSX in its body — it's a pure value function, so it
        // should be callable from `{add(2, 3)}` expression interpolation.
        const md = 'export function add(a, b) {\n  return a + b;\n}\n\nResult: {add(2, 3)}.';
        const tree = mdxish(md);
        expect(Object.keys(tree.data?.mdxishScope?.values ?? {})).toContain('add');
        expect(Object.keys(tree.data?.mdxishScope?.components ?? {})).not.toContain('add');

        const html = mix(md);
        expect(html).toContain('Result: 5.');
      });

      it('exposes value-returning functions and const values together in expressions', () => {
        const md = 'export const base = 10;\nexport function bump(n) { return n + base; }\n\n{bump(5)}';
        const html = mix(md);
        expect(html).toContain('15');
      });
    });
  });
});
