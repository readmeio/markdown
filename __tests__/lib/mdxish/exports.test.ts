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
});
