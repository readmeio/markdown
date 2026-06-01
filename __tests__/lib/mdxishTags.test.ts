import { mdxishTags } from '../../lib';

describe('mdxishTags', () => {
  it('returns custom element names', () => {
    const mdx = '<TagMe />';

    expect(mdxishTags(mdx)).toStrictEqual(['TagMe']);
  });

  it('does not return html tags', () => {
    const mdx = '<br />';

    expect(mdxishTags(mdx)).toStrictEqual([]);
  });

  it('returns block and phrasing content', () => {
    const mdx = `
<Block />

This is phrasing: <Inline />
`;

    expect(mdxishTags(mdx)).toStrictEqual(['Block', 'Inline']);
  });

  it('returns a unique set of names', () => {
    const mdx = `
<Block />

<Block />

<Block />
`;

    expect(mdxishTags(mdx)).toStrictEqual(['Block']);
  });

  it('ignores magic blocks', () => {
    const mdx = `
[block:html]
{
  "html": "<CustomBlock />"
}
[/block]

<Component />
`;

    expect(mdxishTags(mdx)).toStrictEqual(['Component']);
  });

  it('ignores code blocks', () => {
    const mdx = '```javascript\n<Component />\n```';

    expect(mdxishTags(mdx)).toStrictEqual([]);
  });

  it('captures components and nested components', () => {
    const mdx = '<Component>Hello<NestedComponent /></Component>';

    expect(mdxishTags(mdx)).toStrictEqual(['Component', 'NestedComponent']);
  });

  it('captures components with attributes', () => {
    const mdx = '<Component theme="dark" size="large" />';

    expect(mdxishTags(mdx)).toStrictEqual(['Component']);
  });

  it('captures components with non string attributes', () => {
    const mdx = '<Component theme={true} size={1+1} empty quotes={`hello`} />';

    expect(mdxishTags(mdx)).toStrictEqual(['Component']);
  });

  it('captures components with array props', () => {
    const mdx = '<Component data={[1, 2, 3]} />';

    expect(mdxishTags(mdx)).toStrictEqual(['Component']);
  });

  describe('with object props', () => {
    it('captures components with object props', () => {
      const mdx = '<Component data={{ name: "John Doe", age: 30 }} />';

      expect(mdxishTags(mdx)).toStrictEqual(['Component']);
    });

    it('captures components with multiline object props', () => {
      const mdx = `<Component data={{
  name: "John Doe",
  age: 30
}} />`;

      expect(mdxishTags(mdx)).toStrictEqual(['Component']);
    });

    it('captures components with deeply nested object props', () => {
      const mdx = `<Component data={{
  name: "John Doe",
  age: 30,
  nested: {
    name: "Jane Doe",
    age: 20
  }
}} />`;

      expect(mdxishTags(mdx)).toStrictEqual(['Component']);
    });

    it('captures components with array of objects props', () => {
      const mdx = '<Component data={[{ name: "John Doe", age: 30 }, { name: "Jane Doe", age: 20 }]} />';

      expect(mdxishTags(mdx)).toStrictEqual(['Component']);
    });

    it('captures components when there are spaces amongst the props', () => {
      const mdx = `<Component
  data={{
    name: "John Doe",

    age: 30

  }}
/>`;

      expect(mdxishTags(mdx)).toStrictEqual(['Component']);
    });
  });

  describe('inside tables', () => {
    it('captures components inside <Table> blocks', () => {
      const mdx = `<Table>
    <tbody>
      <tr>
        <td><TableBlock /></td>
      </tr>
    </tbody>
  </Table>`;

      expect(mdxishTags(mdx)).toContain('TableBlock');
    });

    it('captures components inside GFM table blocks', () => {
      const mdx = '| Header |\n| --- |\n| <TableBlock /> | <TableBlock2 /> |';

      expect(mdxishTags(mdx)).toStrictEqual(['TableBlock', 'TableBlock2']);
    });

    it('does not capture components inside <table> blocks', () => {
      const mdx = `<table>
    <tbody>
      <tr>
        <td><TableBlock /></td>
      </tr>
    </tbody>
  </table>`;

      expect(mdxishTags(mdx)).toStrictEqual(['TableBlock']);
    });
  });
});
