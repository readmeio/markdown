import { hast, mdxish, plain } from '../../../index';

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

  it('compiles multiple variables to their provided values', () => {
    const md = 'Hello {user.name} from {user.company}';

    expect(plain(hast(md), { variables: { name: 'Owlbert', company: 'ReadMe' } })).toBe('Hello Owlbert from ReadMe');
  });

  it('falls back to key name for unresolved variables when others are provided', () => {
    const md = 'Hello {user.name} from {user.company}';

    expect(plain(hast(md), { variables: { name: 'Owlbert' } })).toBe('Hello Owlbert from company');
  });

  it('preserves variable syntax via hast with preserveVariableSyntax option', () => {
    const txt = 'Hello {user.name} and good bye';

    expect(plain(hast(txt), { preserveVariableSyntax: true })).toBe('Hello {user.name} and good bye');
  });

  it('preserves legacy variable syntax with preserveVariableSyntax option', () => {
    const txt = 'Hello <Variable name="company">company</Variable> and good bye';
    const tree = hast(txt);

    expect(plain(tree, { preserveVariableSyntax: true })).toBe('Hello {user.company} and good bye');
  });

  it('preserveVariableSyntax takes precedence over provided variables', () => {
    const txt = '{user.name}';

    expect(plain(hast(txt), { preserveVariableSyntax: true, variables: { name: 'Owlbert' } })).toBe('{user.name}');
  });

  it('preserveVariableSyntax takes precedence over provided variables for Variable tags', () => {
    const txt = '<Variable name="company">company</Variable>';
    const tree = hast(txt);

    expect(plain(tree, { preserveVariableSyntax: true, variables: { company: 'ReadMe' } })).toBe('{user.company}');
  });

  it('preserves variables inside structured content with preserveVariableSyntax option', () => {
    const txt = `
> 📘 Welcome
>
> Hello {user.name}
    `;
    const tree = hast(txt);

    expect(plain(tree, { preserveVariableSyntax: true })).toBe('Welcome Hello {user.name}');
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
