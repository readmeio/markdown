import { mdast } from '../../index';

describe('Readme Components Transformer', () => {
  const nodes = [
    { md: '<Callout />', type: 'rdme-callout' },
    { md: '<Code />', type: 'code' },
    { md: '<CodeTabs />', type: 'code-tabs' },
    { md: '<Image />', type: 'image-block' },
    { md: '<Table />', type: 'tableau' },
    { md: '<TutorialTile />', type: 'recipe' },
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
  ### It works!
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

  // Every named component here (Callout, Code, Image, HTMLBlock, Table, Embed, Anchor,
  // Recipe/TutorialTile, and the generic `types` map) runs its attributes through `getAttrs()`,
  // which evaluates `{expr}` values with `new Function`. This transformer sits inside the shared
  // `astProcessor` pipeline, so every consumer (mdast, hast, tags, plain, ...) was exposed
  // regardless of what it does with the result — evaluation is a side effect of building the tree,
  // not of using it. safeMode now flattens expressions to their source before any transformer
  // runs. (GHSA-2prv-4jff-x46g)
  describe('safeMode', () => {
    const getHProp = (tree: ReturnType<typeof mdast>, key: string) =>
      (tree.children[0].data as { hProperties?: Record<string, unknown> } | undefined)?.hProperties?.[key];

    it('evaluates JSX attribute expressions by default', () => {
      const tree = mdast('<Callout icon={String(1 + 3)} />');

      expect(getHProp(tree, 'icon')).toBe('4');
    });

    it('does not evaluate JSX attribute expressions when safeMode is true', () => {
      const tree = mdast('<Callout icon={String(1 + 3)} />', { safeMode: true });

      expect(getHProp(tree, 'icon')).toBe('String(1 + 3)');
    });

    it('does not expose Node process globals when safeMode is true', () => {
      const tree = mdast('<Callout icon={typeof process} />', { safeMode: true });

      expect(getHProp(tree, 'icon')).toBe('typeof process');
    });

    it('still coerces Callout into an rdme-callout node when safeMode is true', () => {
      const tree = mdast('<Callout icon="📘" />', { safeMode: true });

      expect(tree.children[0].type).toBe('rdme-callout');
    });

    // `imageTransformer` runs from the shared `remarkPlugins` list, ahead of this transformer,
    // and read attributes through its own unguarded `getAttrs()` call.
    it('does not evaluate expressions read by the image transformer', () => {
      globalThis.imgCanary = false;
      const tree = mdast('<Image alt={(globalThis.imgCanary = true)} src="/x.png" />', { safeMode: true });

      expect(globalThis.imgCanary).toBe(false);
      expect(getHProp(tree, 'alt')).toBe('(globalThis.imgCanary = true)');
    });
  });
});
