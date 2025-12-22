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
});
