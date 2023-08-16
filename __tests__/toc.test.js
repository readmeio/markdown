import { reactTOC, mdast } from '../index';

describe('reactTOC with mdx=true', () => {
  it('renders TOC', () => {
    const doc = `
## First Heading
    `;
    const toc = reactTOC(mdast(doc, { mdx: true }), { mdx: true });

    expect(toc).toMatchInlineSnapshot(`
      <TableOfContents>
        <MDXCreateElement
          mdxType="ul"
          originalType="ul"
        >
          

          <MDXCreateElement
            mdxType="li"
            originalType="li"
          >
            <MDXCreateElement
              href="#first-heading"
              mdxType="a"
              originalType="a"
            >
              First Heading
            </MDXCreateElement>
          </MDXCreateElement>
          

        </MDXCreateElement>
      </TableOfContents>
    `);
  });

  it('renders TOC with html/MDX', () => {
    const doc = `
## First Heading <span>boop</span>
    `;
    const toc = reactTOC(mdast(doc, { mdx: true }), { mdx: true });

    expect(toc).toMatchInlineSnapshot(`
      <TableOfContents>
        <MDXCreateElement
          mdxType="ul"
          originalType="ul"
        >
          

          <MDXCreateElement
            mdxType="li"
            originalType="li"
          >
            <MDXCreateElement
              href="#first-heading-spanboopspan"
              mdxType="a"
              originalType="a"
            >
              First Heading 
              boop
            </MDXCreateElement>
          </MDXCreateElement>
          

        </MDXCreateElement>
      </TableOfContents>
    `);
  });

  it('renders TOC with variables', () => {
    const doc = `
## First Heading <<name>>
    `;
    const toc = reactTOC(mdast(doc, { mdx: true }), { mdx: true });

    expect(toc).toMatchInlineSnapshot(`
      <TableOfContents>
        <MDXCreateElement
          mdxType="ul"
          originalType="ul"
        >
          

          <MDXCreateElement
            mdxType="li"
            originalType="li"
          >
            <MDXCreateElement
              href="#first-heading"
              mdxType="a"
              originalType="a"
            >
              First Heading 
              <Unknown
                variable="name"
              />
            </MDXCreateElement>
          </MDXCreateElement>
          

        </MDXCreateElement>
      </TableOfContents>
    `);
  });

  it.skip('renders TOC including headings from within components', () => {
    const doc = `
<h2>MDX Heading</h2>
    `;
    const toc = reactTOC(mdast(doc, { mdx: true }), { mdx: true });

    expect(toc).toMatchInlineSnapshot();
  });
});
