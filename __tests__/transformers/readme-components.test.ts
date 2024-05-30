import { mdast } from '../../index';

describe('Readme Components Transformer', () => {
  const nodes = [
    { md: '<Callout />', type: 'rdme-callout' },
    { md: '<Code />', type: 'code' },
    { md: '<CodeTabs />', type: 'code-tabs' },
    { md: '<Image />', type: 'image' },
    { md: '<Table />', type: 'table' },
  ];

  it.each(nodes)('transforms $md into a(n) $type node', ({ md, type }) => {
    const tree = mdast(md);

    expect(tree.children[0].type).toBe(type);
  });

  const docs = {
    ['rdme-callout']: {
      md: `> 📘 It works!`,
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
      mdx: `<Code value="This is a code block" />`,
    },
    ['code-tabs']: {
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
    // image: {
    //   md: `![](http://placekitten.com/600/200)`,
    //   mdx: `<Image src="http://placekitten.com/600/200" />`,
    // },
    table: {
      md: `
| h1  | h2  |
| --- | --- |
| a1  | a2  |
      `,
      // @todo there's text nodes that get inserted between the td's. Pretty sure
      // they'd get filtered out by rehype, but lets keep the tests easy.
      mdx: `
<Table>
  <tr>
    <td>h1</td><td>h2</td>
  </tr>
  <tr>
    <td>a1</td><td>a2</td>
  </tr>
</Table>
      `,
    },
  };
  it.each(Object.entries(docs))('matches the equivalent markdown for %s', (type, { md, mdx }) => {
    let mdTree = mdast(md);
    const mdxTree = mdast(mdx);

    if (type === 'image') {
      // @todo something about these dang paragraphs!
      mdTree = {
        type: 'root',
        children: mdTree.children[0].children,
      };
    }

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

  it('converts Glossary components to markdown nodes', () => {
    const mdx = `
<Glossary>Demo</Glossary>
`;

    const tree = mdast(mdx);
    expect(tree.children[0].children[0].type).toBe('readme-glossary-item');
  });

  it('converts Variable components to markdown nodes', () => {
    const mdx = `
<Variable name="tester" />
`;

    const tree = mdast(mdx);
    expect(tree.children[0].type).toBe('readme-variable');
  });
});
