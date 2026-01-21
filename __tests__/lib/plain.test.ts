import { hast, mdxish, plain } from '../../index';

describe('plain compiler', () => {
  it('returns plain text of markdown components', () => {
    const md = `
## Hello!

Is it _me_ you're looking for?
`;

    const tree = hast(md);
    expect(plain(tree)).toBe("Hello! Is it me you're looking for?");
  });

  it("compiles br's to ''", () => {
    const txt = '<br />';

    expect(plain(hast(txt))).toBe('');
  });

  it("compiles hr's to ''", () => {
    const txt = '<hr />';

    expect(plain(hast(txt))).toBe('');
  });

  it('compiles callouts', () => {
    const txt = `
> 📘 Title
>
> Some body
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('Title Some body');
  });

  it('compiles JSX callouts', () => {
    const txt = `
<Callout  icon="📘">
  Title

  Some body
</Callout>
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('Title Some body');
  });

  it('compiles markdown tables', () => {
    const txt = `
| Header 1 | Header 2 |
| :------- | :------- |
| Cell 1   | Cell 2   |
    `;

    expect(plain(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2');
  });

  it('compiles images to their title', () => {
    const txt = `
![image **label**](http://placekitten.com/600/600 "entitled kittens")
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('entitled kittens');
  });

  it('compiles JSX images to their title', () => {
    const txt = `
<Image src="http://placekitten.com/600/600" alt="image **label**" title="entitled kittens" />
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('entitled kittens');
  });

  it('compiles html blocks to their plain text', () => {
    const txt = `
<HTMLBlock>{\`
  <p>Paragraph text</p>
\`}</HTMLBlock>
    `;

    expect(plain(hast(txt))).toBe('Paragraph text');
  });

  it('compiles glossary items to their term', () => {
    const txt = '<Glossary>parliament</Glossary>';

    expect(plain(hast(txt))).toBe('parliament');
  });

  it('compiles variables to their name', () => {
    const txt = '{user.name}';

    expect(plain(hast(txt))).toBe('name');
  });

  it('compiles provided variables to their values', () => {
    const txt = '{user.name}';

    expect(plain(hast(txt), { variables: { name: 'Owlbert' } })).toBe('Owlbert');
  });

  it('removes MDX comments', () => {
    const md = `
## Hello!

{/* comment */}

{
 /**
  * multi-line-comment
  */
}

{
  /* multiple comments */
  this-should-stay
  /* another comment */
}

Is it _me_ you're looking for?
`;

    const hastTree = hast(md);
    expect(plain(hastTree)).toBe("Hello! this-should-stay Is it me you're looking for?");
  });

  it('removes HTML comments', () => {
    const md = `
## Hello!

<!-- comment -->

<!--
  multi-line-comment
-->
Is it _me_ you're looking for?
`;

    // NOTE: using mdxish here to allow HTML comment syntax in the markdown.
    const tree = mdxish(md);
    expect(plain(tree)).toBe("Hello! Is it me you're looking for?");
  });
});
