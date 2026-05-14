import type { Element, ElementContent, Root } from 'hast';

import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib/mdxish';

type AnyNode = ElementContent | Root;

const findElement = (ast: Root, tagName: string): Element | undefined => {
  const walk = (nodes: AnyNode[]): Element | undefined => {
    return nodes.reduce<Element | undefined>((found, node) => {
      if (found) return found;
      if (node.type === 'element' && node.tagName === tagName) return node;
      if ('children' in node && Array.isArray(node.children)) {
        return walk(node.children as AnyNode[]);
      }
      return undefined;
    }, undefined);
  };
  return walk(ast.children as AnyNode[]);
};

const allText = (node: AnyNode | undefined): string => {
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

    const p = findElement(ast, 'p');
    expect(p).toBeDefined();
    expect(allText(p)).toBe('Hi hello.');
  });

  it('makes `export function` declarations available as JSX components', () => {
    const md = 'export function Greeting() {\n  return (<div>Hey Ho</div>);\n}\n\n<Greeting />\n';
    const ast = mdxish(md);

    const el = findElement(ast, 'Greeting');
    expect(el).toBeDefined();
  });

  it('leaves exports as literal text when safeMode is enabled', () => {
    const md = 'export const foo = "hello";\n\nValue: {foo}.';
    const ast = mdxish(md, { safeMode: true });

    const text = allText(ast);
    expect(text).toContain('export const foo');
    expect(text).toContain('{foo}');
  });

  it('falls back gracefully on malformed export bodies', () => {
    // `export const x =;` is syntactically invalid — the tokenizer throws and
    // mdxish falls back to a no-esm parse so the rest of the doc still renders.
    const md = 'export const x =;\n\nHello world.';
    const ast = mdxish(md);

    expect(findElement(ast, 'p')).toBeDefined();
    expect(allText(ast)).toContain('Hello world.');
  });

  it('removes export declarations from the rendered output', () => {
    const md = 'export const foo = "hello";\n\nBody text.';
    const ast = mdxish(md);

    expect(allText(ast)).not.toContain('export const');
  });
});
