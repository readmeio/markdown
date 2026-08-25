import { repairMistakenTableClosers } from '../../processor/transform/mdxish/repair-mistaken-table-closers';

describe('repairMistakenTableClosers (string-level preprocessor)', () => {
  describe('rewrites a bare <table> that is a missing-slash closer', () => {
    it('rewrites the Akamai-style closer before a Notes blockquote', () => {
      const input = `<table>
<tr><th>Option</th><th>Description</th></tr>
<tr><td>foo</td><td>bar</td></tr>
<table>
> **Notes:**
>
> * This behavior is not required for any Enhanced TLS certificates.`;

      expect(repairMistakenTableClosers(input)).toBe(`<table>
<tr><th>Option</th><th>Description</th></tr>
<tr><td>foo</td><td>bar</td></tr>
</table>
> **Notes:**
>
> * This behavior is not required for any Enhanced TLS certificates.`);
    });

    it('rewrites when the next line is a heading', () => {
      expect(repairMistakenTableClosers('<table>\n<tr><td>x</td></tr>\n<table>\n# After')).toBe(
        '<table>\n<tr><td>x</td></tr>\n</table>\n# After',
      );
    });

    it('rewrites when there is no following line (EOF)', () => {
      expect(repairMistakenTableClosers('<table>\n<tr><td>x</td></tr>\n<table>')).toBe(
        '<table>\n<tr><td>x</td></tr>\n</table>',
      );
    });

    it('rewrites when the next non-empty line is a cell closer (nested in a cell)', () => {
      const input = `<table>
<tr><td>
<table>
</td></tr>
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(`<table>
<tr><td>
</table>
</td></tr>
</table>`);
    });

    it('preserves indentation on the rewritten closer', () => {
      expect(repairMistakenTableClosers('<table>\n<tr><td>x</td></tr>\n  <table>\n> note')).toBe(
        '<table>\n<tr><td>x</td></tr>\n  </table>\n> note',
      );
    });

    it('preserves <Table> casing on the rewritten closer', () => {
      expect(repairMistakenTableClosers('<Table>\n<tr><td>x</td></tr>\n<Table>\n> note')).toBe(
        '<Table>\n<tr><td>x</td></tr>\n</Table>\n> note',
      );
    });
  });

  describe('leaves real nested tables alone', () => {
    it('does not rewrite when the next line starts a nested <tr>', () => {
      const input = `<table>
<tr><td>
<table>
<tr><td>nested</td></tr>
</table>
</td></tr>
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite an empty nested <table></table> pair', () => {
      const input = `<table>
<tr><td>
<table>
</table>
</td></tr>
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite when the next line is <thead>', () => {
      const input = `<table>
<tr><td>
<table>
<thead><tr><th>h</th></tr></thead>
</table>
</td></tr>
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite a well-formed table with a real </table>', () => {
      const input = `<table>
<tr><td>foo</td></tr>
</table>
> **Notes:**`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite a leading <table> at depth 0', () => {
      expect(repairMistakenTableClosers('<table>\n<tr><td>x</td></tr>\n</table>')).toBe(
        '<table>\n<tr><td>x</td></tr>\n</table>',
      );
    });
  });

  describe('leaves code and non-bare openers alone', () => {
    it('does not rewrite <table> inside a fenced code block', () => {
      const input = '```html\n<table>\n<tr><td>x</td></tr>\n<table>\n```';
      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite <table> payload inside a raw-text element', () => {
      const input = `<pre>
<table>
<tr><td>x</td></tr>
<table>
literal payload
</pre>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not rewrite <table> text inside a <script> body', () => {
      const input = `<script>
const html = [
<table>,
<table>
];
</script>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not count a <table> sharing a line with a raw-text opener (<pre><table>)', () => {
      const input = `<pre><table></pre>

<table>
caption text
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('does not count payload in a same-line raw-text span (<script>…</script>)', () => {
      const input = `<script>render("<table>")</script>

<table>
caption text
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('counts a <table> opening after a same-line raw-text closer (</pre><table>)', () => {
      const input = `<pre>
payload
</pre><table>
<tr><td>x</td></tr>
<table>
> note`;

      expect(repairMistakenTableClosers(input)).toBe(input.replace('<table>\n> note', '</table>\n> note'));
    });

    it('ignores raw-text payload when judging table depth after the block', () => {
      const input = `<pre>
<table>
</pre>

<table>
<tr><td>x</td></tr>
</table>`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });

    it('still repairs a mistaken closer after a closed raw-text block', () => {
      const input = `<style>
.x { color: red; }
</style>

<table>
<tr><td>x</td></tr>
<table>
> note`;

      expect(repairMistakenTableClosers(input)).toBe(input.replace(/<table>\n> note/, '</table>\n> note'));
    });

    it('does not rewrite a <table> that carries attributes', () => {
      const input = `<table>
<tr><td>x</td></tr>
<table class="x">
> note`;

      expect(repairMistakenTableClosers(input)).toBe(input);
    });
  });
});
