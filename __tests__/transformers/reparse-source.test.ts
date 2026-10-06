import type { Node, Paragraph, Parent, Root, Text } from 'mdast';

import { replaceInheritingReparseSource, stampReparseSource } from '../../processor/transform/mdxish/reparse-source';
import { unwrapParagraphNodes, unwrapSoleParagraph } from '../../processor/transform/mdxish/tables/utils';

const text = (value: string, reparseSource?: string): Text => ({
  type: 'text',
  value,
  ...(reparseSource && { data: { reparseSource } }),
});

const paragraph = (children: Text[], reparseSource?: string): Paragraph => ({
  type: 'paragraph',
  children,
  ...(reparseSource && { data: { reparseSource } }),
});

describe('stampReparseSource', () => {
  it('stamps each root and keeps its existing data', () => {
    const root: Node = { type: 'text', data: { hName: 'span' } };
    stampReparseSource([root], 'body');
    expect(root.data).toStrictEqual({ hName: 'span', reparseSource: 'body' });
  });

  it('keeps a stamp a deeper re-parse already set', () => {
    const root = text('a', 'inner');
    stampReparseSource([root], 'outer');
    expect(root.data).toStrictEqual({ reparseSource: 'inner' });
  });
});

describe('replaceInheritingReparseSource', () => {
  it('splices the replacements in place of the node', () => {
    const parent: Root = { type: 'root', children: [paragraph([]), { type: 'html', value: '<x>' }, paragraph([])] };
    const replacements = [text('a'), text('b')];
    replaceInheritingReparseSource(parent, 1, replacements);
    expect(parent.children).toStrictEqual([paragraph([]), text('a'), text('b'), paragraph([])]);
  });

  it("stamps every replacement with the replaced node's source", () => {
    const parent: Root = { type: 'root', children: [{ type: 'html', value: '<x>', data: { reparseSource: 'body' } }] };
    replaceInheritingReparseSource(parent, 0, [text('a'), text('b', 'inner')]);
    expect(parent.children).toStrictEqual([text('a', 'body'), text('b', 'inner')]);
  });

  it('leaves replacements unstamped when the replaced node indexes into the document', () => {
    const parent: Parent = { type: 'paragraph', children: [text('x')] };
    replaceInheritingReparseSource(parent, 0, [text('a')]);
    expect(parent.children).toStrictEqual([text('a')]);
  });
});

describe('table paragraph unwrapping', () => {
  it("passes an unwrapped paragraph's stamp to its children", () => {
    expect(unwrapParagraphNodes([paragraph([text('a'), text('b', 'inner')], 'cell')])).toStrictEqual([
      text('a', 'cell'),
      text('b', 'inner'),
    ]);
  });

  it('leaves children of an unstamped paragraph unstamped', () => {
    expect(unwrapSoleParagraph([paragraph([text('a')])])).toStrictEqual([text('a')]);
  });

  it('does not stamp when multiple paragraphs stay wrapped', () => {
    const children = [paragraph([text('a')], 'cell'), paragraph([text('b')], 'cell')];
    expect(unwrapSoleParagraph(children)).toStrictEqual([
      paragraph([text('a')], 'cell'),
      paragraph([text('b')], 'cell'),
    ]);
  });
});
