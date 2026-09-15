import { mdxishMdastToMd } from '../../../lib';
import { parseMdxish } from '../../helpers';

/** Round-trips markdown through the mdxish parser and back out through the serializer. */
const roundTrip = (doc: string): string => mdxishMdastToMd(parseMdxish(doc));

const PIPE_ROW = /^\|.*\|$/m;

describe('mdxishMdastToMd on parser-produced trees', () => {
  describe('tables (RM-18383)', () => {
    // The old tablesToJsx sampled only the FIRST cell and bailed on an empty one, so a table
    // whose block content sits in later cells collapsed into a flattened pipe table.
    const tableWithBlockCells = `<Table align={["left","left"]}>
  <thead>
    <tr>
      <th>
        Item
      </th>

      <th>
        Description
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>

      </td>

      <td>
        **Section header**
      </td>
    </tr>

    <tr>
      <td>
        2.
      </td>

      <td>
        Pick a region:

        1. Click the Region icon.
        2. Select **Add Region**.
      </td>
    </tr>
  </tbody>
</Table>
`;

    it('keeps a JSX-authored Table with block-content cells in JSX form', () => {
      const result = roundTrip(tableWithBlockCells);

      expect(result).toContain('<Table');
      expect(result).not.toMatch(PIPE_ROW);
      // The nested ordered list survives as a real list, not run-on text.
      expect(result).toMatch(/1\. Click the Region icon\./);
      expect(result).toMatch(/2\. Select \*\*Add Region\*\*\./);
    });

    it('keeps a simple pipe table as a pipe table', () => {
      const result = roundTrip('| a | b |\n| - | - |\n| 1 | 2 |\n');

      expect(result).toMatch(PIPE_ROW);
      expect(result).not.toContain('<Table');
    });
  });

  describe('parser-only node types', () => {
    it('round-trips expressions and JSX comments verbatim', () => {
      const doc = 'Your plan is {user.plan} today.\n\n{/* reviewer note */}\n';

      const result = roundTrip(doc);

      expect(result).toContain('{user.plan}');
      expect(result).toContain('{/* reviewer note */}');
    });

    it('round-trips an export statement verbatim', () => {
      const result = roundTrip('export const meta = { flag: true };\n\nProse after.\n');

      expect(result).toContain('export const meta = { flag: true };');
      expect(result).toContain('Prose after.');
    });

    it('serializes a captioned image block to an Image element', () => {
      const doc = [
        '[block:image]',
        JSON.stringify({
          images: [
            {
              image: ['https://files.readme.io/abc-shot.png', '', 'Dashboard screenshot'],
              align: 'center',
              caption: 'The dashboard after setup',
            },
          ],
        }),
        '[/block]',
      ].join('\n');

      const result = roundTrip(doc);

      expect(result).toContain('<Image');
      expect(result).toContain('src="https://files.readme.io/abc-shot.png"');
      expect(result).toContain('The dashboard after setup');
    });

    it('serializes an image-block caption holding readme nodes instead of crashing', () => {
      const doc = [
        '[block:image]',
        JSON.stringify({
          images: [
            {
              image: ['https://files.readme.io/abc-shot.png', '', 'Alt'],
              align: 'center',
              caption: 'Includes :joy: and <<glossary:merchantId>>',
            },
          ],
        }),
        '[/block]',
      ].join('\n');

      expect(() => roundTrip(doc)).not.toThrow();
    });

    it('serializes a tutorial tile to a Recipe element', () => {
      const doc = ['[block:tutorial-tile]', JSON.stringify({ slug: 'send-a-message', title: 'Send a message' }), '[/block]'].join(
        '\n',
      );

      const result = roundTrip(doc);

      expect(result).toContain('<Recipe');
      expect(result).toContain('slug="send-a-message"');
    });

    // A sidebar magic block parses into an `rdme-pin` wrapper the mdxish dialect has no
    // spelling for, so it unwraps to its content — matching readmeToMdx's behavior
    // (readmeio/markdown#1618, greptile P1).
    it('unwraps a pinned magic block instead of throwing', () => {
      const doc = ['[block:code]', JSON.stringify({ sidebar: true, codes: [{ code: 'const x = 1', language: 'javascript' }] }), '[/block]'].join(
        '\n',
      );

      expect(roundTrip(doc)).toContain('const x = 1');
    });

    it('serializes an attribute-less image block as plain markdown', () => {
      const doc = ['[block:image]', JSON.stringify({ images: [{ image: ['https://x.io/a.png', '', 'Alt'] }] }), '[/block]'].join(
        '\n',
      );

      expect(roundTrip(doc)).toContain('![Alt](https://x.io/a.png)');
    });

    it('keeps block separation around an image carrying readme attributes', () => {
      const doc = [
        'Intro paragraph.',
        '',
        '[block:image]',
        JSON.stringify({ images: [{ image: ['https://x.io/a.png', null, null], align: 'left', sizing: '50%' }] }),
        '[/block]',
        '',
        '# Heading',
        '',
        'Trailing paragraph.',
        '',
      ].join('\n');

      const result = roundTrip(doc);

      expect(result).toContain('align="left"');
      expect(result).toContain('width="50%"');
      expect(result).toContain('\n\n# Heading\n\n');
    });

    it('keeps the HTMLBlock wrapper on an html magic block, gate included', () => {
      const doc = ['[block:html]', JSON.stringify({ html: '<style>.x{color:red}</style>' }), '[/block]'].join('\n');

      const result = roundTrip(doc);

      expect(result).toContain('<HTMLBlock runScripts="false">');
      expect(result).toContain('<style>.x{color:red}</style>');
    });

    it('serializes a legacy callout magic block as a Callout element', () => {
      const doc = ['[block:callout]', JSON.stringify({ type: 'info', title: 'Heads up', body: 'The body.' }), '[/block]'].join(
        '\n',
      );

      const result = roundTrip(doc);

      expect(result).toContain('<Callout icon="📘"');
      expect(result).toContain('Heads up');
      expect(result).toContain('The body.');
    });

    it('serializes a multi-language code magic block as named adjacent fences', () => {
      const doc = [
        '[block:code]',
        JSON.stringify({
          codes: [
            { code: 'a=1', language: 'python', name: 'first' },
            { code: 'b=2', language: 'js', name: 'second' },
          ],
        }),
        '[/block]',
      ].join('\n');

      expect(roundTrip(doc)).toBe('```python first\na=1\n```\n```js second\nb=2\n```\n');
    });

    it('serializes an embed magic block as an Embed element', () => {
      const doc = [
        '[block:embed]',
        JSON.stringify({ html: false, url: 'https://youtu.be/abc', title: 'Vid', favicon: 'https://y.t/f.ico' }),
        '[/block]',
      ].join('\n');

      const result = roundTrip(doc);

      expect(result).toContain('<Embed url="https://youtu.be/abc"');
      expect(result).toContain('title="Vid"');
    });

    // `[block:table]` has no case in the magic-block transformer's main switch, so it parses into
    // the `div` fallback. `divTransformer` keeps that from reaching remark-stringify as an
    // unhandled node — the output is degenerate, but it must not throw.
    it('serializes a legacy table magic block without throwing', () => {
      const doc = ['[block:table]', JSON.stringify({ foo: 'bar' }), '[/block]'].join('\n');

      expect(() => roundTrip(doc)).not.toThrow();
    });

    it('round-trips frontmatter verbatim', () => {
      expect(roundTrip('---\ntitle: Hi\n---\n\nBody text\n')).toBe('---\ntitle: Hi\n---\n\nBody text\n');
    });
  });

  describe('mdxish dialect', () => {
    it('serializes a legacy callout in JSX form, like the editor serializer', () => {
      const result = roundTrip('> 📘 Nota\n>\n> El cuerpo.\n');

      expect(result).toContain('<Callout');
      expect(result).toContain('Nota');
      expect(result).not.toContain('> 📘');
    });

    it('round-trips a gemoji shortcode verbatim', () => {
      expect(roundTrip('A :joy: shortcode\n')).toBe('A :joy: shortcode\n');
    });

    // `mdxishCompilers` owns the `variable` handler and writes `{user.<name>}`. Pinned so an edit
    // there can't quietly change what a parsed doc round-trips to.
    it('writes variables as expressions and stays stable across a second pass', () => {
      const once = roundTrip('Hello <<user>> there\n');

      expect(once).toContain('{user.user}');
      expect(roundTrip(once)).toBe(once);
    });

    it('serializes a glossary term as a Glossary element', () => {
      expect(roundTrip('See <<glossary:merchantId>> here\n')).toContain('<Glossary>merchantId</Glossary>');
    });

    it('keeps CJK-adjacent emphasis parseable through the round trip', () => {
      // The `_` marker cannot flank a CJK letter, so the serializer entity-encodes the
      // neighbours (`こ&#x306E;_…_`); byte-ugly, but the emphasis survives a re-parse.
      const result = roundTrip('この*用語*は**重要**です。\n');

      expect(result).toContain('**重要**');
      const reparsed = parseMdxish(result);
      const emphasisValues: string[] = [];
      const walk = (node: { children?: unknown[]; type?: string; value?: string }): void => {
        if (node.type === 'emphasis') {
          (node.children as { value?: string }[] | undefined)?.forEach(child => {
            if (child.value) emphasisValues.push(child.value);
          });
        }
        (node.children as typeof node[] | undefined)?.forEach(walk);
      };
      walk(reparsed as never);
      expect(emphasisValues).toContain('用語');
    });

    it('is stable across a second round trip on editor-vocabulary content', () => {
      const doc = [
        '# Title',
        '',
        'Prose with **bold**, *emphasis*, and `code`.',
        '',
        '> 📘 Heads up',
        '>',
        '> Callout body.',
        '',
        '- item one',
        '- item two',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '```js',
        'const x = 1;',
        '```',
        '',
      ].join('\n');
      const once = roundTrip(doc);

      expect(roundTrip(once)).toBe(once);
    });
  });
});
