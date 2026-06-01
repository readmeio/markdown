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
});