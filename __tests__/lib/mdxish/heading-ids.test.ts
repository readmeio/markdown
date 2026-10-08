import type { Element } from 'hast';
import type { Heading } from 'mdast';

import { mdast, mdxish } from '../../../lib';
import { collectNodes, parseMdxish } from '../../helpers';

const isHeadingElement = (node: { tagName?: string }) => /^h[1-6]$/.test(node.tagName ?? '');

const renderedHeadings = (doc: string, opts = {}) =>
  collectNodes<Element>(mdxish(doc, opts), isHeadingElement).map(node => ({
    id: node.properties.id,
    text: collectNodes(node, 'text')
      .map(text => ('value' in text ? text.value : ''))
      .join(''),
  }));

describe.each([
  ['with expressions', { safeMode: false }],
  ['in safe mode', { safeMode: true }],
])('explicit heading ids (RM-18626) %s', (_, opts) => {
  it.each([
    ['an ATX heading', '## Prérequis {#prerequisites}', 'Prérequis', 'prerequisites'],
    ['inline code before the id', '## Call `init()` {#call-init}', 'Call init()', 'call-init'],
    ['a setext heading', 'Prérequis {#prerequisites}\n===', 'Prérequis', 'prerequisites'],
    ['a closing sequence', '## Setup {#setup} ##', 'Setup', 'setup'],
    ['a compact heading', '##Setup {#setup}', 'Setup', 'setup'],
    [
      'an id with underscores',
      '## The `__init__` method {#the-__init__-method}',
      'The __init__ method',
      'the-__init__-method',
    ],
    ['a unicode id', '## Café {#café}', 'Café', 'café'],
    ['a heading that is only an id', '## {#empty}', '', 'empty'],
    ['a heading whose emphasis is normalized', '## hello_world_ {#stable}', 'helloworld', 'stable'],
    ['an escaped backslash before the brace', '## Use \\\\{#each}', 'Use \\', 'each'],
    ['an underscore that could pair with one in the id', '## _Text {#xy_}', '_Text', 'xy_'],
    ['trailing spaces after the id', '## Setup {#setup}   ', 'Setup', 'setup'],
    ['a legacy api-header block', '[block:api-header]\n{"title":"Magic {#magic}","level":2}\n[/block]', 'Magic', 'magic'],
  ])('reads %s', (__, doc, text, id) => {
    expect(renderedHeadings(doc, opts)).toStrictEqual([{ id, text }]);
  });

  it.each([
    ['an escaped brace', '## Use \\{#each\\}', 'Use {#each}', 'use-each'],
    ['an id that is not last', '## A {#a} b', 'A {#a} b', 'a-a-b'],
    ['a character ids cannot use', '## Rock {#a&b}', 'Rock {#a&b}', 'rock-ab'],
  ])('leaves %s as text', (__, doc, text, id) => {
    expect(renderedHeadings(doc, opts)).toStrictEqual([{ id, text }]);
  });

  it.each([
    ['a list', '- ## Setup {#setup}'],
    ['a blockquote', '> ## Setup {#setup}'],
    ['a Callout', '<Callout icon="📘" theme="info">\n  ## Setup {#setup}\n</Callout>'],
  ])('reads an id inside %s', (__, doc) => {
    expect(renderedHeadings(doc, opts)).toStrictEqual([{ id: 'setup', text: 'Setup' }]);
  });

  it('reads an id on a blockquote callout title', () => {
    const [title] = renderedHeadings('> 📘 Title {#stable}\n> Body', opts);
    expect(title).toStrictEqual({ id: 'stable', text: 'Title' });
  });

  it('keeps a line-final {#x} in a paragraph as it was', () => {
    const paragraph = collectNodes<Element>(mdxish('Para ends {#x}', opts), node => (node as Element).tagName === 'p');
    expect(
      collectNodes(paragraph[0], 'text')
        .map(text => ('value' in text ? text.value : ''))
        .join(''),
    ).toBe('Para ends {#x}');
  });

  it.each([
    ['two trailing spaces', 'Text {#x}  \nnext', 1],
    ['a trailing tab', 'Text {#x}\t\nnext', 0],
  ])('keeps a paragraph line ending in {#x} and %s as it was', (__, doc, breaks) => {
    const tree = mdxish(doc, { ...opts, hardBreaks: false });
    const [paragraph] = collectNodes<Element>(tree, node => (node as Element).tagName === 'p');

    expect(collectNodes<Element>(paragraph, node => (node as Element).tagName === 'br')).toHaveLength(breaks);
    expect(
      collectNodes(paragraph, 'text')
        .map(text => ('value' in text ? text.value : ''))
        .join(''),
    ).toBe('Text {#x}\nnext');
  });

  it('keeps the id out of the heading text in the mdast', () => {
    const [heading] = collectNodes<Heading>(parseMdxish('## Prérequis {#prerequisites}', opts), 'heading');
    expect(heading.children).toStrictEqual([expect.objectContaining({ type: 'text', value: 'Prérequis' })]);
  });
});

test.each([
  [{ safeMode: false }, { id: 'lead-lead', text: 'Lead {#lead}' }],
  [{ safeMode: true }, { id: 'lead--lead-', text: 'Lead { #lead }' }],
])('does not read an id with spaces inside the braces (%o)', (opts, expected) => {
  expect(renderedHeadings('## Lead { #lead }', opts)).toStrictEqual([expected]);
});

test('decodes a character reference in a line-final suffix that is not an id in safe mode', () => {
  const [paragraph] = collectNodes<Element>(mdxish('Text {#a&amp;b}', { safeMode: true }), node => (node as Element).tagName === 'p');

  expect(
    collectNodes(paragraph, 'text')
      .map(text => ('value' in text ? text.value : ''))
      .join(''),
  ).toBe('Text {#a&b}');
});

describe('explicit heading ids in RMDX', () => {
  it('stays unsupported, so strict-MDX validators keep rejecting it', () => {
    expect(() => mdast('## Prérequis {#prerequisites}')).toThrow(/Could not parse expression/);
  });
});
