import type { Element } from 'hast';
import type { Heading } from 'mdast';

import { mdast, mdxish } from '../../../lib';
import stripComments from '../../../lib/stripComments';
import { collectNodes, parseMdxish } from '../../helpers';

const isElement = (tagName: RegExp) => (node: { tagName?: string }) => tagName.test(node.tagName ?? '');

const textOf = (node: Element) =>
  collectNodes(node, 'text')
    .map(text => ('value' in text ? text.value : ''))
    .join('');

const renderedHeadings = (doc: string, opts = {}) =>
  collectNodes<Element>(mdxish(doc, opts), isElement(/^h[1-6]$/)).map(node => ({ id: node.properties.id, text: textOf(node) }));

const renderedParagraph = (doc: string, opts = {}) =>
  collectNodes<Element>(mdxish(doc, opts), isElement(/^p$/))[0];

describe.each([
  ['with expressions', { safeMode: false }],
  ['in safe mode', { safeMode: true }],
])('explicit heading ids (RM-18626) %s', (_, opts) => {
  it.each([
    ['an ATX heading', '## Prérequis {#prerequisites}', 'Prérequis', 'prerequisites'],
    ['inline code before the id', '## Call `init()` {#call-init}', 'Call init()', 'call-init'],
    ['a closing sequence', '## Setup {#setup} ##', 'Setup', 'setup'],
    ['a compact heading', '##Setup {#setup}', 'Setup', 'setup'],
    ['a tab before the id', '## Setup\t{#setup}', 'Setup', 'setup'],
    ['trailing spaces after the id', '## Setup {#setup}   ', 'Setup', 'setup'],
    ['a `#` in the heading text', '## C# {#sharp}', 'C#', 'sharp'],
    ['an id with underscores', '## The `__init__` method {#the-__init__-method}', 'The __init__ method', 'the-__init__-method'],
    ['a unicode id', '## Café {#café}', 'Café', 'café'],
    ['a heading that is only an id', '## {#empty}', '', 'empty'],
    ['a heading whose emphasis is normalized', '## hello_world_ {#stable}', 'helloworld', 'stable'],
    ['an underscore that could pair with one in the id', '## _Text {#xy_}', '_Text', 'xy_'],
  ])('reads %s', (__, doc, text, id) => {
    expect(renderedHeadings(doc, opts)).toStrictEqual([{ id, text }]);
  });

  it.each([
    ['an escaped brace', '## Use \\{#each\\}', 'Use {#each}', 'use-each'],
    ['no space before the brace', '## Setup{#x}', 'Setup{#x}', 'setupx'],
    ['an id that is not last', '## A {#a} b', 'A {#a} b', 'a-a-b'],
    ['a character ids cannot use', '## Rock {#a&b}', 'Rock {#a&b}', 'rock-ab'],
    ['a setext heading', 'Prérequis {#prerequisites}\n===', 'Prérequis {#prerequisites}', 'prérequis-prerequisites'],
    ['a blockquote callout title', '> 📘 Title {#stable}\n> Body', 'Title {#stable}', 'title-stable'],
    [
      'a legacy api-header title',
      '[block:api-header]\n{"title":"Magic {#magic}","level":2}\n[/block]',
      'Magic {#magic}',
      'magic-magic',
    ],
  ])('leaves %s as it was', (__, doc, text, id) => {
    expect(renderedHeadings(doc, opts)[0]).toStrictEqual({ id, text });
  });

  it.each([
    ['a list', '- ## Setup {#setup}'],
    ['a blockquote', '> ## Setup {#setup}'],
    ['a Callout', '<Callout icon="📘" theme="info">\n  ## Setup {#setup}\n</Callout>'],
  ])('reads an id inside %s', (__, doc) => {
    expect(renderedHeadings(doc, opts)).toStrictEqual([{ id: 'setup', text: 'Setup' }]);
  });

  it.each([
    ['two trailing spaces', 'Text {#x}  \nnext', 1],
    ['a trailing tab', 'Text {#x}\t\nnext', 0],
  ])('keeps a paragraph line ending in {#x} and %s as it was', (__, doc, breaks) => {
    const paragraph = renderedParagraph(doc, { ...opts, hardBreaks: false });

    expect(collectNodes<Element>(paragraph, isElement(/^br$/))).toHaveLength(breaks);
    expect(textOf(paragraph)).toBe('Text {#x}\nnext');
  });

  it('keeps a line-final {#x} in a paragraph as it was', () => {
    expect(textOf(renderedParagraph('Para ends {#x}', opts))).toBe('Para ends {#x}');
  });

  it('keeps the id out of the heading text in the mdast', () => {
    const [heading] = collectNodes<Heading>(parseMdxish('## Prérequis {#prerequisites}', opts), 'heading');
    expect(heading.children).toStrictEqual([expect.objectContaining({ type: 'text', value: 'Prérequis' })]);
  });
});

describe('explicit heading ids leave prose alone in safe mode', () => {
  it('still pairs emphasis across a line-final {#…_}', () => {
    const paragraph = renderedParagraph('_Text {#xy_}', { safeMode: true });

    expect(collectNodes<Element>(paragraph, isElement(/^em$/))).toHaveLength(1);
    expect(textOf(paragraph)).toBe('Text {#xy}');
  });

  it('still renders an emoji inside a line-final {#…}', () => {
    expect(textOf(renderedParagraph('See {#:tada:}', { safeMode: true }))).toBe('See {#🎉}');
  });

  it('still decodes a character reference in a line-final {#…}', () => {
    expect(textOf(renderedParagraph('Text {#a&amp;b}', { safeMode: true }))).toBe('Text {#a&b}');
  });
});

test.each([
  [{ safeMode: false }, { id: 'lead-lead', text: 'Lead {#lead}' }],
  [{ safeMode: true }, { id: 'lead--lead-', text: 'Lead { #lead }' }],
])('does not read an id with spaces inside the braces (%o)', (opts, expected) => {
  expect(renderedHeadings('## Lead { #lead }', opts)).toStrictEqual([expected]);
});

test('stripComments keeps a heading id it does not parse', async () => {
  await expect(stripComments('## Setup {#x}\n', { mdxish: true })).resolves.toBe('## Setup {#x}');
});

describe('explicit heading ids in RMDX', () => {
  it('stays unsupported, so strict-MDX validators keep rejecting it', () => {
    expect(() => mdast('## Prérequis {#prerequisites}')).toThrow(/Could not parse expression/);
  });
});
