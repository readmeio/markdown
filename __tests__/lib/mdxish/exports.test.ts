import type { ElementContent, Root } from 'hast';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib/mdxish';
import renderMdxish from '../../../lib/renderMdxish';
import { findElementByTagName } from '../../helpers';

type AnyNode = ElementContent | Root;

const allText = (node: AnyNode | null | undefined): string => {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return (node.children as AnyNode[]).map(child => allText(child)).join('');
  }
  return '';
};

describe('mdxish MDX exports', () => {
  it('resolves `export const` values inside `{...}` expressions', () => {
    const md = 'export const foo = "hello";\n\nHi {foo}.';
    const ast = mdxish(md);

    const p = findElementByTagName(ast,'p');
    expect(p).toBeDefined();
    expect(allText(p)).toBe('Hi hello.');
  });

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

  it('leaves exports as literal text when safeMode is enabled', () => {
    const md = 'export const foo = "hello";\n\nValue: {foo}.';
    const ast = mdxish(md, { safeMode: true });

    const text = allText(ast);
    expect(text).toContain('export const foo');
    expect(text).toContain('{foo}');
  });

  it('throws on malformed export bodies so authors see the syntax error', () => {
    // `export const x =;` is syntactically invalid. We deliberately don't
    // swallow the acorn error — the author needs to know their export is
    // broken rather than have it silently disappear from the rendered doc.
    const md = 'export const x =;\n\nHello world.';
    expect(() => mdxish(md)).toThrow(/unexpected|parse|syntax/i);
  });

  it('does not treat prose starting with "Export"/"Import" as ESM', () => {
    // Bare keywords without a real declarator (const/function/etc.) should
    // not opt the doc into mdxjsEsm tokenization — otherwise acorn would
    // choke on plain English.
    const md = 'Export your data by clicking save.\n\nImport the file first.';
    const ast = mdxish(md);
    expect(allText(ast)).toContain('Export your data');
    expect(allText(ast)).toContain('Import the file');
  });

  it('removes export declarations from the rendered output', () => {
    const md = 'export const foo = "hello";\n\nBody text.';
    const ast = mdxish(md);

    expect(allText(ast)).not.toContain('export const');
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
      expect(allText(tree)).toContain('Result: 5.');
    });

    it('exposes value-returning functions and const values together in expressions', () => {
      const md = 'export const base = 10;\nexport function bump(n) { return n + base; }\n\n{bump(5)}';
      const tree = mdxish(md);
      expect(allText(tree)).toContain('15');
    });

    it('leaves JSX-returning function calls as literal {...} text in expression position', () => {
      // `{x()}` where x is a component would otherwise stringify a React
      // element object as garbage. Components aren't in expression scope, so
      // the call falls through to the error branch and the source text is
      // preserved. Authors should use `<X />` to render JSX-returning exports.
      const md = 'export function X() { return <div>hi</div>; }\n\n{X()}';
      const tree = mdxish(md);
      const text = allText(tree);
      expect(text).toContain('{X()}');
      expect(text).not.toContain('"type":"div"');
    });
  });
});
