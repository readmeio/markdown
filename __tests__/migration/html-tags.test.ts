import { migrate } from '../helpers';

describe('migrating html tags', () => {
  describe('br tags', () => {
    it('converts unclosed br tags to self-closing', () => {
      const md = `This is a line with a break<br>and another line.
Multiple breaks<br><br>in sequence.
Already closed<br />should remain unchanged.`;

      const mdx = migrate(md);
      expect(mdx).toMatchInlineSnapshot(`
        "This is a line with a break<br />and another line.\\
        Multiple breaks<br /><br />in sequence.\\
        Already closed<br />should remain unchanged.
        "
      `);
    });

    it('handles br tags with attributes', () => {
      const md = 'Line with styled break<br class="clear">and more text.';

      const mdx = migrate(md);
      expect(mdx).toMatchInlineSnapshot(`
        "Line with styled break<br class="clear" />and more text.
        "
      `);
    });

    it('does not change br tags inside code blocks', () => {
      const md = `Not a \`<br>\` tag.

\`\`\`
Also not a \`<br>\` tag.
\`\`\``;

      const mdx = migrate(md);
      expect(mdx).toMatchInlineSnapshot(`
        "Not a \`<br>\` tag.

        \`\`\`
        Also not a \`<br>\` tag.
        \`\`\`
        "
      `);
    });
  });
});
