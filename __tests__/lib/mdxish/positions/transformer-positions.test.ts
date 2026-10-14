import type { Node } from 'mdast';

import { mdast } from '../../../../lib';
import { collectNodes, slicesUnder } from '../../../helpers';

const isType =
  (type: string) =>
  (node: Node): boolean =>
    node.type === type;

const isParagraph = isType('paragraph');

// RM-18923: nodes a transformer builds or splits must slice their own document text.
describe('positions of transformed nodes (RM-18923)', () => {
  describe('blockquote callouts', () => {
    it.each([
      [
        'a title and body on consecutive lines',
        '> 📘 Title\n> body line',
        [
          ['rdme-callout', '> 📘 Title\n> body line'],
          ['heading', 'Title'],
          ['text', 'Title'],
          ['paragraph', 'body line'],
          ['text', 'body line'],
        ],
      ],
      [
        'a blank line between title and body',
        '> 🚧 Title\n>\n> body para',
        [
          ['rdme-callout', '> 🚧 Title\n>\n> body para'],
          ['heading', 'Title'],
          ['text', 'Title'],
          ['paragraph', 'body para'],
          ['text', 'body para'],
        ],
      ],
      [
        'a `#` heading title',
        '> 📘 ### Title\n> body',
        [
          ['rdme-callout', '> 📘 ### Title\n> body'],
          ['heading', '### Title'],
          ['text', 'Title'],
          ['paragraph', 'body'],
          ['text', 'body'],
        ],
      ],
      [
        'CRLF line endings',
        '> 📘 Title\r\n> body line',
        [
          ['rdme-callout', '> 📘 Title\r\n> body line'],
          ['heading', 'Title'],
          ['text', 'Title'],
          ['paragraph', 'body line'],
          ['text', 'body line'],
        ],
      ],
    ])('splits %s', (_, md, expected) => {
      expect(slicesUnder(md, isType('rdme-callout'))).toStrictEqual(expected);
    });

    it('starts the title after the icon in the MDX engine too', () => {
      const [heading] = collectNodes(mdast('> 📘 Title\n> body'), 'heading');
      expect(heading.position).toStrictEqual({
        start: { line: 1, column: 6, offset: 5 },
        end: { line: 1, column: 11, offset: 10 },
      });
    });

    it('gives an untitled JSX callout placeholder the callout range', () => {
      const md = '<Callout icon="📘" theme="info">\n  Body only\n</Callout>';
      expect(slicesUnder(md, isType('rdme-callout'))).toStrictEqual([
        ['rdme-callout', md],
        ['paragraph', md],
        ['text', md],
        ['paragraph', 'Body only'],
        ['text', 'Body only'],
      ]);
    });
  });

  describe('magic blocks', () => {
    it('gives every node a block builds the block range', () => {
      const md = '[block:callout]\n{\n  "type": "info",\n  "title": "Note",\n  "body": "Body *em*"\n}\n[/block]';
      expect(new Set(slicesUnder(md, isType('rdme-callout')).map(([, slice]) => slice))).toStrictEqual(new Set([md]));
    });

    it('fits the paragraph a block was lifted out of to what remains on each side', () => {
      const block = '[block:html]\n{\n  "html": "<b>x</b>"\n}\n[/block]';
      const md = `Before ${block} after`;
      const slices = slicesUnder(md, () => true, { newEditorTypes: false }).filter(([type]) => type === 'paragraph');
      expect(slices).toStrictEqual([
        ['paragraph', 'Before '],
        ['paragraph', ' after'],
      ]);
    });
  });

  describe('variables', () => {
    it.each([
      ['an expression', {}],
      ['text in safe mode', { safeMode: true }],
    ])('positions a {user.*} variable parsed from %s', (_, opts) => {
      expect(slicesUnder('Hi {user.name}, welcome', isParagraph, { newEditorTypes: true, ...opts })).toStrictEqual([
        ['paragraph', 'Hi {user.name}, welcome'],
        ['text', 'Hi '],
        ['readme-variable', '{user.name}'],
        ['text', ', welcome'],
      ]);
    });

    it('maps variables on a blockquote continuation line past its prefix', () => {
      const md = '> line one\n> Hi {user.name}';
      expect(slicesUnder(md, isParagraph, { newEditorTypes: true, safeMode: true })).toStrictEqual([
        ['paragraph', 'line one\n> Hi {user.name}'],
        ['text', 'line one\n> Hi '],
        ['readme-variable', '{user.name}'],
      ]);
    });
  });

  describe('malformed emphasis', () => {
    it.each([
      [
        'a space after the opening marker',
        'This is ** bold** text',
        [
          ['text', 'This is '],
          ['strong', '** bold**'],
          ['text', 'bold'],
          ['text', ' text'],
        ],
      ],
      [
        'a space moved in front of the markers',
        'Hello** Wrong Bold** end',
        [
          ['text', 'Hello'],
          ['strong', '** Wrong Bold**'],
          ['text', 'Wrong Bold'],
          ['text', ' end'],
        ],
      ],
      [
        'markers in different text nodes',
        '**bold [link](https://x.com) ** y',
        [
          ['strong', '**bold [link](https://x.com) **'],
          ['text', 'bold '],
          ['link', '[link](https://x.com)'],
          ['text', 'link'],
          ['text', ' y'],
        ],
      ],
    ])('positions the parts rebuilt from %s', (_, md, expected) => {
      expect(slicesUnder(md, isParagraph).slice(1)).toStrictEqual(expected);
    });
  });

  describe('inline components and glossary terms', () => {
    it.each([
      ['an inline <Glossary>', 'See <Glossary>term</Glossary> here.', 'Glossary', '<Glossary>term</Glossary>'],
      ['a legacy glossary term', 'See <<glossary:term>> here.', 'readme-glossary-item', '<<glossary:term>>'],
    ])('positions %s and its term', (_, md, label, slice) => {
      expect(slicesUnder(md, isParagraph).slice(2, 4)).toStrictEqual([
        [label, slice],
        ['text', 'term'],
      ]);
    });

    it('positions an inline <Anchor> converted to an anchor node', () => {
      const md = 'Go <Anchor href="https://x.com">there</Anchor> now';
      expect(slicesUnder(md, isType('readme-anchor'))).toStrictEqual([
        ['readme-anchor', '<Anchor href="https://x.com">there</Anchor>'],
        ['text', 'there'],
      ]);
    });
  });
});
