import type { Node } from 'mdast';

import { resolvedSlicesUnder } from '../../helpers';

const magicBlock = (type: string, json: Record<string, unknown>) =>
  [`[block:${type}]`, JSON.stringify(json), '[/block]'].join('\n');

// The block follows a paragraph so a position left in its JSON's coordinates would land on it.
const blockSlices = (block: string, isRoot: (node: Node) => boolean) =>
  resolvedSlicesUnder(['Intro paragraph.', '', block].join('\n'), isRoot);

const isType = (type: string) => (node: Node) => node.type === type;

describe('mdxish magic block source positions', () => {
  it('gives a callout the block range and its title and body their own sources', () => {
    const block = magicBlock('callout', { type: 'info', title: 'Hi *there*', body: 'Body **bold**' });

    expect(blockSlices(block, isType('rdme-callout'))).toStrictEqual([
      ['rdme-callout', block],
      ['text', 'Hi '],
      ['emphasis', '*there*'],
      ['text', 'there'],
      ['paragraph', 'Body **bold**'],
      ['text', 'Body '],
      ['strong', '**bold**'],
      ['text', 'bold'],
    ]);
  });

  it('gives a parameters table the block range and each cell its own source', () => {
    const block = magicBlock('parameters', { data: { 'h-0': 'Name', '0-0': 'cell *em*' }, cols: 1, rows: 1 });

    expect(blockSlices(block, isType('table'))).toStrictEqual([
      ['table', block],
      ['text', 'Name'],
      ['text', 'cell '],
      ['emphasis', '*em*'],
      ['text', 'em'],
    ]);
  });

  it.each([
    ['without', {}],
    ['with', { caption: 'Cap *em*' }],
  ])('gives an image %s a caption the block range', (_, caption) => {
    const block = magicBlock('image', {
      images: [{ image: ['https://example.com/a.png', 'a.png', 100, 100], ...caption }],
    });

    expect(blockSlices(block, isType('image-block'))).toStrictEqual([['image-block', block]]);
  });

  it('gives an api-header the block range and its title its own source', () => {
    const block = magicBlock('api-header', { title: 'Get *users*', level: 2 });

    expect(blockSlices(block, isType('heading'))).toStrictEqual([
      ['heading', block],
      ['text', 'Get '],
      ['emphasis', '*users*'],
      ['text', 'users'],
    ]);
  });
});
