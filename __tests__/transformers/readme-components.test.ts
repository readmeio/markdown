import { mdast } from '../../index';

describe('Readme Components Transformer', () => {
  const nodes = [
    { md: '<Callout />', type: 'rdme-callout' },
    { md: '<Code />', type: 'code' },
    { md: '<CodeTabs />', type: 'code-tabs' },
    { md: '<Image />', type: 'image-block' },
    { md: '<Table />', type: 'tableau' },
    { md: '<TutorialTile />', type: 'tutorial-tile' },
  ];

  it.each(nodes)('transforms $md into a(n) $type node', ({ md, type }) => {
    const tree = mdast(md);

    expect(tree.children[0].type).toBe(type);
  });

  const docs = {
    'rdme-callout': {
      md: '> 📘 It works!',
      mdx: `
<Callout icon="📘">
  It works!
</Callout>`,
    },
    code: {
      md: `
~~~
This is a code block
~~~
    `,
      mdx: '<Code value="This is a code block" />',
    },
    'code-tabs': {
      md: `
~~~
First
~~~
~~~
Second
~~~
    `,
      mdx: `
<CodeTabs>
  <Code value='First' />
  <Code value='Second' />
</CodeTabs>
    `,
    },
    image: {
      md: '![](http://placekitten.com/600/200)',
      mdx: '<Image src="http://placekitten.com/600/200" />',
    },
  };

  it.each(Object.entries(docs))('matches the equivalent markdown for %s', (type, { md, mdx }) => {
    const mdTree = mdast(md);
    const mdxTree = mdast(mdx);

    expect(mdxTree).toStrictEqualExceptPosition(mdTree);
  });

  it('does not convert components that have custom implementations', () => {
    const mdx = `
<Callout heading="Much wow" icon="❗" />
`;

    const tree = mdast(mdx, {
      components: {
        Callout: () => null,
      },
    });

    expect(tree.children[0].type).toBe('mdxJsxFlowElement');
    expect(tree.children[0].name).toBe('Callout');
  });

  it('converts variable phrasing expressions to markdown nodes', () => {
    const mdx = '{user.name}';

    const tree = mdast(mdx);
    expect(tree.children[0].type).toBe('readme-variable');
  });
});
