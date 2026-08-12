import type { Root } from 'mdast';
import type { Event } from 'micromark-util-types';

import { fromMarkdown } from 'mdast-util-from-markdown';
import { parse, postprocess, preprocess } from 'micromark';

import { mdxComponentFromMarkdown } from '../../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../../lib/micromark/mdx-component';

const eventsFor = (source: string): Event[] =>
  postprocess(
    parse({ extensions: [mdxComponent()] })
      .document()
      .write(preprocess()(source, 'utf8', true)),
  );

const claimedComponents = (source: string): string[] =>
  eventsFor(source)
    .filter(([event, token]) => event === 'enter' && token.type === 'mdxComponent')
    .map(([, token]) => source.slice(token.start.offset, token.end.offset));

const parseMdast = (source: string): Root =>
  fromMarkdown(source, {
    extensions: [mdxComponent()],
    mdastExtensions: [mdxComponentFromMarkdown()],
  });

describe('RM-16375 unquoted native HTML attributes', () => {
  it('claims a flow tag and emits one HTML node', () => {
    const source = '<div data-url=https://example.com>\nExample\n</div>';

    expect(claimedComponents(source)).toStrictEqual([source]);
    expect(parseMdast(source)).toMatchObject({
      type: 'root',
      children: [{ type: 'html', value: source }],
    });
  });

  it('claims an inline opening tag without consuming its surrounding text', () => {
    const source = 'Before <a href=https://example.com>Example</a> after';

    expect(claimedComponents(source)).toStrictEqual(['<a href=https://example.com>']);
    expect(parseMdast(source)).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Before ' },
            { type: 'html', value: '<a href=https://example.com>' },
            { type: 'text', value: 'Example' },
            { type: 'html', value: '</a>' },
            { type: 'text', value: ' after' },
          ],
        },
      ],
    });
  });

  it.each([
    '<img src=https://example.com/image.png />',
    '<div class = unquoted-class>Example</div>',
    '<div\r\n class=unquoted-class>\r\nExample\r\n</div>',
  ])('claims valid whitespace, line-ending, and self-closing variants: %s', source => {
    expect(claimedComponents(source)).toStrictEqual([source]);
  });

  it.each(['<a href=>', '<a href==value>'])('does not claim malformed assignments: %s', source => {
    expect(claimedComponents(source)).toStrictEqual([]);
  });

  it.each(['"', "'", '<', '=', '`'])('does not claim values containing the forbidden %s delimiter', delimiter => {
    expect(claimedComponents(`<a href=value${delimiter}suffix>`)).toStrictEqual([]);
  });
});
