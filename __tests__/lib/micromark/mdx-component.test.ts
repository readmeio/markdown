import type { Nodes, Root } from 'mdast';
import type { Event } from 'micromark-util-types';

import { fromMarkdown } from 'mdast-util-from-markdown';
import { parse, postprocess, preprocess } from 'micromark';

import { mdxComponentFromMarkdown } from '../../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../../lib/micromark/mdx-component';

const LINK_OPEN = '<a href=https://example.com>';
const LINK = `${LINK_OPEN}Example</a>`;
const FLOW = '<div data-url=https://example.com>\nExample\n</div>';

const claimedComponents = (source: string): string[] =>
  postprocess(parse({ extensions: [mdxComponent()] }).document().write(preprocess()(source, 'utf8', true)))
    .filter(([event, token]: Event) => event === 'enter' && token.type === 'mdxComponent')
    .map(([, token]: Event) => source.slice(token.start.offset, token.end.offset));

const parseMdast = (source: string): Root =>
  fromMarkdown(source, { extensions: [mdxComponent()], mdastExtensions: [mdxComponentFromMarkdown()] });

const mdastTypes = (node: Nodes): string[] => [
  node.type,
  ...('children' in node ? node.children.flatMap(mdastTypes) : []),
];

describe('RM-16375 unquoted native HTML attributes', () => {
  it.each([
    ['flow', FLOW, [FLOW], ['root', 'html']],
    ['text', `Before ${LINK} after`, [LINK_OPEN], ['root', 'paragraph', 'text', 'html', 'text', 'html', 'text']],
  ])('claims %s input and emits the expected MDAST shape', (_context, source, claims, types) => {
    expect(claimedComponents(source)).toStrictEqual(claims);
    expect(mdastTypes(parseMdast(source))).toStrictEqual(types);
  });

  it.each([
    '<img src=https://example.com/image.png />',
    '<div class = unquoted-class>Example</div>',
    '<div\r\n class=unquoted-class>\r\nExample\r\n</div>',
  ])('claims valid whitespace, line-ending, and self-closing variants: %s', source => {
    expect(claimedComponents(source)).toStrictEqual([source]);
  });

  it.each([
    '<a href=>',
    '<a href==value>',
    ...['"', "'", '<', '=', '`'].map(delimiter => `<a href=value${delimiter}suffix>`),
  ])('does not claim malformed or forbidden unquoted values: %s', source => {
    expect(claimedComponents(source)).toStrictEqual([]);
  });

  it.each([
    ['flow emphasis', '<div class=outer>*Example*</div>', ['<div class=outer>*Example*</div>'], ['root', 'html']],
    ['text * emphasis', `*${LINK}*`, [LINK_OPEN], ['root', 'paragraph', 'emphasis', 'html', 'text', 'html']],
    ['text _ emphasis', `_${LINK}_`, [LINK_OPEN], ['root', 'paragraph', 'emphasis', 'html', 'text', 'html']],
    ['escaped flow opening', '\\<div class=outer>Example</div>', [], ['root', 'paragraph', 'text', 'html']],
    ['escaped text opening', 'Before \\<span class=inner>Example</span> after', [], ['root', 'paragraph', 'text', 'html', 'text']],
    ['flow nesting', `<div class=outer>${LINK}</div>`, [`<div class=outer>${LINK}</div>`], ['root', 'html']],
    ['text nesting', `Before <span class=outer>${LINK}</span> after`, ['<span class=outer>', LINK_OPEN], ['root', 'paragraph', 'text', 'html', 'html', 'text', 'html', 'html', 'text']],
    ['flow blank lines', `<div class=outer>\n\n${LINK}\n\n</div>`, [`<div class=outer>\n\n${LINK}\n\n</div>`], ['root', 'html']],
    ['text blank lines', `Before\n\n${LINK}\n\nAfter`, [LINK_OPEN], ['root', 'paragraph', 'text', 'paragraph', 'html', 'text', 'html', 'paragraph', 'text']],
    ['flow formatting', '<div\n class = outer>\nExample\n</div>', ['<div\n class = outer>\nExample\n</div>'], ['root', 'html']],
    ['text formatting', 'Before <a\thref\t=\thttps://example.com>Example</a> after', ['<a\thref\t=\thttps://example.com>'], ['root', 'paragraph', 'text', 'html', 'text', 'html', 'text']],
  ])('handles %s with the expected claim and MDAST shape', (_case, source, claims, types) => {
    expect(claimedComponents(source)).toStrictEqual(claims);
    expect(mdastTypes(parseMdast(source))).toStrictEqual(types);
  });
});
