import type { Node, RootContent } from 'mdast';
import type { Point } from 'unist';

import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';

import {
  createNodeValueToDocumentMapper,
  getDocumentSource,
  type MarkdownFragment,
  reparseMarkdownFragment,
} from '../../processor/transform/mdxish/parse-markdown-fragment';

const pointAt = (doc: string, offset: number): Point => {
  const lines = doc.slice(0, offset).split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1, offset };
};

/** A fragment of `parentValue`, whose node spans `parentSource` in `doc`. */
const fragmentIn = (doc: string, parentSource: string, parentValue: string, rawText: string): MarkdownFragment => {
  const start = doc.indexOf(parentSource);
  return {
    parentNode: {
      position: { start: pointAt(doc, start), end: pointAt(doc, start + parentSource.length) },
      value: parentValue,
    },
    offsetInParentNode: parentValue.indexOf(rawText),
    rawText,
  };
};

const documentSlices = (doc: string, nodes: RootContent[]) => {
  const slices: [string, string | undefined][] = [];
  nodes.forEach(root =>
    visit(root, (node: Node) => {
      slices.push([node.type, node.position && doc.slice(node.position.start.offset, node.position.end.offset)]);
    }),
  );
  return slices;
};

describe('reparseMarkdownFragment', () => {
  it('maps a deindented component body onto the document', () => {
    const doc = 'Intro\n\n<Wrapper>\n  - one\n  - **two**\n</Wrapper>\n';
    const parent = '<Wrapper>\n  - one\n  - **two**\n</Wrapper>';
    const fragment = fragmentIn(doc, parent, parent, '\n  - one\n  - **two**\n');

    expect(
      documentSlices(doc, reparseMarkdownFragment(fragment, '- one\n- **two**', { documentSource: doc })),
    ).toStrictEqual([
      ['list', '- one\n  - **two**'],
      ['listItem', '- one'],
      ['paragraph', 'one'],
      ['text', 'one'],
      ['listItem', '- **two**'],
      ['paragraph', '**two**'],
      ['strong', '**two**'],
      ['text', 'two'],
    ]);
  });

  it('puts back the blockquote prefixes stripped from the parent value', () => {
    const doc = '> <Wrapper>\n>   - one\n>   - __two__\n> </Wrapper>';
    const fragment = fragmentIn(
      doc,
      doc.slice(2),
      '<Wrapper>\n  - one\n  - __two__\n</Wrapper>',
      '\n  - one\n  - __two__\n',
    );

    expect(
      documentSlices(doc, reparseMarkdownFragment(fragment, '- one\n- __two__', { documentSource: doc })),
    ).toStrictEqual([
      ['list', '- one\n>   - __two__'],
      ['listItem', '- one'],
      ['paragraph', 'one'],
      ['text', 'one'],
      ['listItem', '- __two__'],
      ['paragraph', '__two__'],
      ['strong', '__two__'],
      ['text', 'two'],
    ]);
  });

  it('skips blank lines the reshape inserted', () => {
    const doc = '<Wrapper>\n<div>\n*a* and _b_\n</div>\n</Wrapper>';
    const fragment = fragmentIn(doc, doc, doc, '\n<div>\n*a* and _b_\n</div>\n');

    expect(
      documentSlices(doc, reparseMarkdownFragment(fragment, '<div>\n\n*a* and _b_\n</div>', { documentSource: doc })),
    ).toStrictEqual([
      ['html', '<div>'],
      ['paragraph', '*a* and _b_'],
      ['emphasis', '*a*'],
      ['text', 'a'],
      ['text', ' and '],
      ['emphasis', '_b_'],
      ['text', 'b'],
      ['html', '</div>'],
    ]);
  });

  it('maps a tab-indented body', () => {
    const doc = '<Wrapper>\n\t\t**a**\n</Wrapper>';
    const fragment = fragmentIn(doc, doc, doc, '\n\t\t**a**\n');

    expect(documentSlices(doc, reparseMarkdownFragment(fragment, '**a**', { documentSource: doc }))).toStrictEqual([
      ['paragraph', '**a**'],
      ['strong', '**a**'],
      ['text', 'a'],
    ]);
  });

  it('maps CRLF line endings', () => {
    const doc = '<Wrapper>\r\n  - one\r\n  - two\r\n</Wrapper>';
    const fragment = fragmentIn(doc, doc, doc, '\r\n  - one\r\n  - two\r\n');

    expect(
      documentSlices(doc, reparseMarkdownFragment(fragment, '- one\n- two', { documentSource: doc })),
    ).toStrictEqual([
      ['list', '- one\r\n  - two'],
      ['listItem', '- one'],
      ['paragraph', 'one'],
      ['text', 'one'],
      ['listItem', '- two'],
      ['paragraph', 'two'],
      ['text', 'two'],
    ]);
  });

  it('maps lines and columns across lone CR line endings', () => {
    const doc = '<Wrapper>\r**a**\r</Wrapper>';
    const fragment = fragmentIn(doc, doc, doc, '\r**a**\r');
    const [paragraph] = reparseMarkdownFragment(fragment, '**a**', { documentSource: doc });

    expect(paragraph.position).toStrictEqual({
      start: { line: 2, column: 1, offset: 10 },
      end: { line: 2, column: 6, offset: 15 },
    });
  });

  it('maps a body on the same line as its tags', () => {
    const doc = 'Lead <Wrapper>**a** and __b__</Wrapper> out';
    const parent = '<Wrapper>**a** and __b__</Wrapper>';
    const fragment = fragmentIn(doc, parent, parent, '**a** and __b__');

    expect(
      documentSlices(doc, reparseMarkdownFragment(fragment, '**a** and __b__', { documentSource: doc })),
    ).toStrictEqual([
      ['paragraph', '**a** and __b__'],
      ['strong', '**a**'],
      ['text', 'a'],
      ['text', ' and '],
      ['strong', '__b__'],
      ['text', 'b'],
    ]);
  });

  it('gives text that is not verbatim in the document the whole fragment range', () => {
    const doc = '<Wrapper>&amp; **a**</Wrapper>';
    const fragment = fragmentIn(doc, doc, doc, '&amp; **a**');

    expect(documentSlices(doc, reparseMarkdownFragment(fragment, '& **a**', { documentSource: doc }))).toStrictEqual([
      ['paragraph', '&amp; **a**'],
      ['text', '&amp; **a**'],
      ['strong', '&amp; **a**'],
      ['text', '&amp; **a**'],
    ]);
  });

  it('drops positions when the parent has none to map onto', () => {
    const fragment = { parentNode: { value: '<Wrapper>**a**</Wrapper>' }, offsetInParentNode: 9, rawText: '**a**' };

    expect(documentSlices('', reparseMarkdownFragment(fragment, '**a**', { documentSource: '' }))).toStrictEqual([
      ['paragraph', undefined],
      ['strong', undefined],
      ['text', undefined],
    ]);
  });
});

// CX-4028
describe('createNodeValueToDocumentMapper', () => {
  /** A node whose `value` spans `doc` from where its first line appears to the end. */
  const nodeIn = (doc: string, value: string) => {
    const start = doc.indexOf(value.split('\n')[0]);
    return { position: { start: pointAt(doc, start), end: pointAt(doc, doc.length) }, value };
  };

  /** What the mapped range of `value`'s `from`–`to` slices out of `doc`. */
  const mappedSlice = (doc: string, value: string, from: number, to: number) => {
    const { start, end } = createNodeValueToDocumentMapper(nodeIn(doc, value), doc)!(from, to);
    return doc.slice(start.offset, end.offset);
  };

  it('returns null without a position', () => {
    expect(createNodeValueToDocumentMapper({ value: 'a' }, 'a')).toBeNull();
  });

  it('shifts a verbatim value by its start point', () => {
    const doc = 'Hello\n<x>\n  <y>';
    const value = '<x>\n  <y>';
    const toDocumentPosition = createNodeValueToDocumentMapper(nodeIn(doc, value), doc)!;

    expect(toDocumentPosition(value.indexOf('<y>'), value.length)).toStrictEqual({
      start: { line: 3, column: 3, offset: 12 },
      end: { line: 3, column: 6, offset: 15 },
    });
  });

  it('adds back the prefix a container stripped from each continuation line', () => {
    const doc = '> <x>\n>   <y>\n><z>';
    const value = '<x>\n  <y>\n<z>';

    expect(mappedSlice(doc, value, value.indexOf('<y>'), value.length)).toBe('<y>\n><z>');
    expect(mappedSlice(doc, value, 0, value.indexOf('\n'))).toBe('<x>');
  });

  it('aligns a line whose prefix tab was expanded to spaces', () => {
    const doc = '> <x>\n>\t<y>';
    const value = '<x>\n  <y>';

    expect(mappedSlice(doc, value, value.indexOf('<y>'), value.length)).toBe('<y>');
  });

  it("falls back to the node's range when a line is not in the document", () => {
    const doc = '> <x>\n> <nope>';
    const value = '<x>\n<y>';

    expect(mappedSlice(doc, value, value.indexOf('<y>'), value.length)).toBe(doc.slice(2));
  });
});

describe('getDocumentSource', () => {
  it('returns the source the VFile holds', () => {
    expect(getDocumentSource(new VFile({ value: '# Hi' }))).toBe('# Hi');
  });

  it('warns when the VFile has no source', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getDocumentSource(new VFile())).toBe('');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
