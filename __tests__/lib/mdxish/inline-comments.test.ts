import type { Parent, Table } from 'mdast';

import { mdxishMdastToMd } from '../../../lib';
import { collectNodes, parseMdxish, roundTripMdxish } from '../../helpers';

// RM-19746: MDX-ish saves `<!-- -->` as written instead of rewriting it to `{/* */}`.
describe('mdxishMdastToMd html comments', () => {
  it.each([
    ['a block comment', '<!-- reviewer note -->\n'],
    ['an inline comment', 'Before <!-- reviewer note --> after\n'],
    ['a comment inside emphasis', 'Some _em <!-- a --> phasis_ and **strong <!-- b --> text**\n'],
    ['a comment inside link text', '[link <!-- c --> text](https://a.com)\n'],
    ['a multi-line comment holding markdown', '<!--\n# Heading\n**bold**\n-->\n'],
    ['a comment holding `*/`', '<!-- path /usr/*/bin */ end -->\n'],
    ['adjacent comments', '<!-- one --><!-- two -->\n'],
    ['a comment in a style tag', '<style>\n<!--\n.a { color: red }\n-->\n</style>\n'],
    ['a comment after a heading', '# Title <!-- note -->\n'],
    ['comments in list items', '- item <!-- a -->\n- <!-- b --> second\n'],
    ['a comment wrapping a component', '<!--\n<Callout icon="📘" theme="info">\n  hidden\n</Callout>\n-->\n'],
  ])('round-trips %s as written', (_label, doc) => {
    expect(roundTripMdxish(doc)).toBe(doc);
  });

  describe('html inside a component body', () => {
    it.each([
      [
        'a comment on its own line',
        '<Callout icon="📘" theme="info">\n  <!-- c -->\n  Text\n</Callout>\n',
        '<Callout icon="📘" theme="info">\n  <!-- c -->\n\n  Text\n</Callout>\n',
      ],
      [
        'a comment on the opener line',
        '<Callout icon="📘" theme="info"> <!-- c -->\n  Text\n</Callout>\n',
        '<Callout icon="📘" theme="info">\n  <!-- c -->\n\n  Text\n</Callout>\n',
      ],
      [
        'a tag on the opener line',
        '<Callout icon="📘" theme="info"> <div>x</div>\n  Text\n</Callout>\n',
        '<Callout icon="📘" theme="info">\n  <div>x</div>\n\n  Text\n</Callout>\n',
      ],
      [
        'a comment in a nested tab',
        '<Tabs>\n  <Tab title="One">\n    <!-- c -->\n    Body\n  </Tab>\n</Tabs>\n',
        '<Tabs>\n  <Tab title="One">\n    <!-- c -->\n\n    Body\n  </Tab>\n</Tabs>\n',
      ],
    ])('keeps the indent of %s stable across saves', (_label, doc, saved) => {
      const once = roundTripMdxish(doc);

      expect(once).toBe(saved);
      expect(roundTripMdxish(once)).toBe(saved);
    });
  });

  // A table that can't stay GFM saves as JSX, which re-parses with strict mdxjs.
  describe('a comment in a table saved as JSX', () => {
    it.each([
      [
        'the table has column widths',
        (table: Table) => {
          table.data = { ...table.data, widths: ['200px'] };
        },
      ],
      [
        'a cell holds a code block',
        (table: Table) => {
          (table.children[1].children[0] as Parent).children.push({ type: 'code', lang: 'js', value: 'x' });
        },
      ],
    ])('writes it as a JSX comment when %s', (_label, makeJsx) => {
      const tree = parseMdxish('| a |\n| - |\n| x <!-- c --> **b** |\n');
      makeJsx(collectNodes<Table>(tree, 'table')[0]);

      const saved = mdxishMdastToMd(tree);
      const reloaded = parseMdxish(saved);

      expect(saved).toContain('<Table');
      expect(saved).toContain('{/* c */}');
      expect(collectNodes(reloaded, 'html')).toHaveLength(0);
      expect(collectNodes(reloaded, 'strong')).toHaveLength(1);
    });
  });
});
