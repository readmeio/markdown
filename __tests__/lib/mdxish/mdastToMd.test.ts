import type { Root as MdastRoot } from 'mdast';

import { mdastToMd, mdxishMdastToMd } from '../../../lib';
import { parseMdxish } from '../../helpers';

/** Round-trips markdown through the mdxish parser and the round-trip serializer. */
const roundTrip = (doc: string): string => mdastToMd(parseMdxish(doc));

const PIPE_ROW = /^\|.*\|$/m;

describe('mdastToMd', () => {
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
  });

  describe('mdxish dialect', () => {
    it('serializes a legacy callout in JSX form, like the editor serializer', () => {
      const result = roundTrip('> 📘 Nota\n>\n> El cuerpo.\n');

      expect(result).toContain('<Callout');
      expect(result).toContain('Nota');
      expect(result).not.toContain('> 📘');
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

    it('matches the editor serializer byte-for-byte on editor-vocabulary content', () => {
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
      const tree = parseMdxish(doc);

      // Both serializers mutate their input, so each gets its own clone.
      expect(mdastToMd(structuredClone(tree) as MdastRoot)).toBe(mdxishMdastToMd(structuredClone(tree) as MdastRoot));
    });
  });
});
