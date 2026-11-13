import type { Html, Nodes, Root } from 'mdast';
import type { Event } from 'micromark-util-types';

import { fromMarkdown } from 'mdast-util-from-markdown';
import { parse, postprocess, preprocess } from 'micromark';
import { describe, expect, it } from 'vitest';

import { mdxishAstProcessor } from '../../../lib';
import { mdxComponentFromMarkdown } from '../../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../../lib/micromark/mdx-component';
import { collectNodes } from '../../helpers';

const LINK_OPEN = '<a href=https://example.com>';
const LINK = `${LINK_OPEN}Example</a>`;
const FLOW = '<div data-url=https://example.com>\nExample\n</div>';

const claimedComponents = (source: string): string[] =>
  postprocess(
    parse({ extensions: [mdxComponent()] })
      .document()
      .write(preprocess()(source, 'utf8', true)),
  )
    .filter(([event, token]: Event) => event === 'enter' && token.type === 'mdxComponent')
    .map(([, token]: Event) => source.slice(token.start.offset, token.end.offset));

const parseMdast = (source: string): Root =>
  fromMarkdown(source, { extensions: [mdxComponent()], mdastExtensions: [mdxComponentFromMarkdown()] });

const mdastTypes = (node: Nodes): string[] => [
  node.type,
  ...('children' in node ? node.children.flatMap(mdastTypes) : []),
];

const htmlValues = (doc: string) => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc);
  return collectNodes<Html>(processor.parse(parserReadyContent), 'html').map(node => node.value);
};

describe('RM-16375 unquoted native HTML attributes', () => {
  it.each(['Pass <key=value> to the CLI.', 'Compare <a = b> and <c = d>.', 'Pass <input.value=foo> to the CLI.'])(
    'does not claim tag-like prose: %s',
    source => {
      expect(claimedComponents(source)).toStrictEqual([]);
      expect(mdastTypes(parseMdast(source))).toStrictEqual(['root', 'paragraph', 'text']);
    },
  );

  it.each([
    '<Image src=https://example.com/a.png?w=1 align=center />',
    '<Image value=foo"bar" />',
    "<Image value=foo'bar' />",
    '<Image value=foo`bar` />',
  ])('continues to claim PascalCase components with permissive attribute values: %s', source => {
    expect(claimedComponents(source)).toStrictEqual([source]);
    expect(mdastTypes(parseMdast(source))).toStrictEqual(['root', 'html']);
  });

  it.each([
    ['flow', FLOW, [FLOW], ['root', 'html']],
    ['text', `Before ${LINK} after`, [LINK_OPEN], ['root', 'paragraph', 'text', 'html', 'text', 'html', 'text']],
  ])('claims %s input and emits the expected MDAST shape', (_context, source, claims, types) => {
    expect(claimedComponents(source)).toStrictEqual(claims);
    expect(mdastTypes(parseMdast(source))).toStrictEqual(types);
  });

  it('keeps a brace-bearing lowercase tag as one JSX element', () => {
    const source = '<a title={"name"} href=https://example.com?a=b>Example</a>';
    expect(claimedComponents(source)).toStrictEqual([source]);
  });

  it.each(['https://example.com/{id}', 'x{id}'])('treats a mid-value brace as literal text: href=%s', value => {
    const opener = `<a href=${value}>`;
    expect(claimedComponents(`Before ${opener}**Example**</a> after`)).toStrictEqual([opener]);
    expect(mdastTypes(parseMdast(`Before ${opener}**Example**</a> after`))).toContain('strong');
  });

  it.each(['pre', 'script', 'textarea'])('leaves a raw <%s> body to html-flow', tag => {
    const source = `<${tag} class=x>\`</${tag}>\`\n\n# Heading\n\n</${tag}>`;
    expect(claimedComponents(source)).toStrictEqual([]);
    expect(mdastTypes(parseMdast(source))).toContain('heading');
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
    [
      'escaped text opening',
      'Before \\<span class=inner>Example</span> after',
      [],
      ['root', 'paragraph', 'text', 'html', 'text'],
    ],
    ['flow nesting', `<div class=outer>${LINK}</div>`, [`<div class=outer>${LINK}</div>`], ['root', 'html']],
    [
      'text nesting',
      `Before <span class=outer>${LINK}</span> after`,
      ['<span class=outer>', LINK_OPEN],
      ['root', 'paragraph', 'text', 'html', 'html', 'text', 'html', 'html', 'text'],
    ],
    [
      'flow blank lines',
      `<div class=outer>\n\n${LINK}\n\n</div>`,
      [`<div class=outer>\n\n${LINK}\n\n</div>`],
      ['root', 'html'],
    ],
    [
      'text blank lines',
      `Before\n\n${LINK}\n\nAfter`,
      [LINK_OPEN],
      ['root', 'paragraph', 'text', 'paragraph', 'html', 'text', 'html', 'paragraph', 'text'],
    ],
    [
      'flow formatting',
      '<div\n class = outer>\nExample\n</div>',
      ['<div\n class = outer>\nExample\n</div>'],
      ['root', 'html'],
    ],
    [
      'text formatting',
      'Before <a\thref\t=\thttps://example.com>Example</a> after',
      ['<a\thref\t=\thttps://example.com>'],
      ['root', 'paragraph', 'text', 'html', 'text', 'html', 'text'],
    ],
  ])('handles %s with the expected claim and MDAST shape', (_case, source, claims, types) => {
    expect(claimedComponents(source)).toStrictEqual(claims);
    expect(mdastTypes(parseMdast(source))).toStrictEqual(types);
  });
});

describe('mdxComponent tokenizer', () => {
  describe('flow: closers hidden in the body', () => {
    it.each([
      ['a code span', '<Box title={a b}>\n`</Box>`\n</Box>'],
      ['a code span spanning lines', '<Box title={a b}>\n`code\n</Box>\nmore`\n</Box>'],
      ['a fence', '<Box title={a b}>\n```\n</Box>\n```\n</Box>'],
      ['an indented fence', '<Box title={a b}>\n  ```\n  </Box>\n  ```\n</Box>'],
      ['a tilde fence', '<Box title={a b}>\n~~~\n</Box>\n~~~\n</Box>'],
      ['an expression', '<Box title={a b}>\n{"</Box>"}\n</Box>'],
      ['an expression spanning lines', '<Box title={a b}>\n{"a\n</Box>\nb"}\n</Box>'],
      // eslint-disable-next-line no-template-curly-in-string
      ['a template literal', '<Box title={a b}>\n{`</Box>${"</Box>"}`}\n</Box>'],
      ['an attribute expression spanning lines', '<Box title={"\n</Box>\n"}>\none\n</Box>'],
    ])('claims the whole block past a closer in %s', (_label, doc) => {
      expect(htmlValues(doc)).toStrictEqual([doc]);
    });

    it('keeps a lone backtick literal, so the closer on its line still counts', () => {
      expect(htmlValues('<Box title={a b}>\n`x </Box>')).toStrictEqual(['<Box title={a b}>\n`x </Box>']);
    });

    it('ends a code span at a blank line, so a closer after it counts', () => {
      expect(htmlValues('<Box title={a b}>\n`a\n\n</Box>\nb`\n</Box>')[0]).toBe('<Box title={a b}>\n`a\n\n</Box>');
    });
  });

  describe('text: inline form', () => {
    it.each([
      ['a code span', 'Hi <Anchor href={x}>a `</Anchor>` b</Anchor> c', '<Anchor href={x}>a `</Anchor>` b</Anchor>'],
      ['a lone backtick', 'Hi <Anchor href={x}>a ` b</Anchor> c', '<Anchor href={x}>a ` b</Anchor>'],
      [
        'an expression',
        'Hi <Anchor href={x}>a {"</Anchor>"} b</Anchor> c',
        '<Anchor href={x}>a {"</Anchor>"} b</Anchor>',
      ],
      ['a brace in an attribute string', 'Hi <Anchor href={"}"}>x</Anchor> c', '<Anchor href={"}"}>x</Anchor>'],
    ])('claims one node past a closer in %s', (_label, doc, value) => {
      expect(htmlValues(doc)).toStrictEqual([value]);
    });

    it('leaves a code span that crosses a line to CommonMark', () => {
      expect(htmlValues('Hi <Anchor href={x}>a `x\n</Anchor>` b</Anchor>')).toStrictEqual([
        '<Anchor href={x}>',
        '</Anchor>',
      ]);
    });
  });
});
