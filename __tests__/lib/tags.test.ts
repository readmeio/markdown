import { tags } from '../../lib';

describe('tags', () => {
  it('returns custom element names', () => {
    const mdx = '<TagMe />';

    expect(tags(mdx)).toStrictEqual(['TagMe']);
  });

  it('does not return html tags', () => {
    const mdx = '<br />';

    expect(tags(mdx)).toStrictEqual([]);
  });

  it('returns block and phrasing content', () => {
    const mdx = `
<Block />

This is phrasing: <Inline />
`;

    expect(tags(mdx)).toStrictEqual(['Block', 'Inline']);
  });

  it('returns a unique set of names', () => {
    const mdx = `
<Block />

<Block />

<Block />
`;

    expect(tags(mdx)).toStrictEqual(['Block']);
  });

  it('captures components inside <Table> blocks', () => {
    const mdx = `<Table>
  <tbody>
    <tr>
      <td><TableBlock /></td>
    </tr>
  </tbody>
</Table>`;

    expect(tags(mdx)).toStrictEqual(['TableBlock']);
  });

  describe('inside HTML tags', () => {
    it('captures components inside <p> tags', () => {
      const mdx = '<p><Component /></p>';

      expect(tags(mdx)).toStrictEqual(['Component']);
    });
  });

  // Tag names never depend on evaluated attribute values, so `tags()` always parses in safeMode
  // rather than exposing every caller to `new Function`. (GHSA-2prv-4jff-x46g)
  describe('attribute expressions are never evaluated', () => {
    // Uses a known component (`Callout`) because the readme-components transformer only reads
    // attributes off names it recognizes — an arbitrary tag never reaches `getAttrs()`. Its
    // evaluated attributes were then thrown away, making the eval a pure side effect of parsing.
    it('does not evaluate an attribute expression', () => {
      globalThis.rmdxTagCanary = false;
      tags('<Callout icon={(globalThis.rmdxTagCanary = true)} />');

      expect(globalThis.rmdxTagCanary).toBe(false);
    });

    it('does not throw when an attribute expression references an undefined global', () => {
      expect(() => tags('<Callout icon={process.env.SOME_CANARY} />')).not.toThrow();
    });

    it('still returns tag names for expression-valued attributes', () => {
      expect(tags('<Component value={1 + 1} />')).toStrictEqual(['Component']);
    });
  });

  describe('nested components', () => {
    it('captures nested components', () => {
      const mdx = '<Component><NestedComponent /></Component>';

      expect(tags(mdx)).toStrictEqual(['Component', 'NestedComponent']);
    });
  });
});