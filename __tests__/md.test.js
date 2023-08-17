import { md, mdast } from '../index';

describe('md (doc, { mdx: true })', () => {
  it('serializes basic content', () => {
    const doc = `
# Heading

<h1>JSX version</h1>
    `;

    const string = md(mdast(doc, { mdx: true }), { mdx: true });

    expect(string).toBe(`# Heading

<h1>JSX version</h1>
    
`);
  });

  it('serializes nested jsx content', () => {
    const doc = `
<h1>Before <span>JSX version</span></h1>
    `;

    const string = md(mdast(doc, { mdx: true }), { mdx: true });

    expect(string).toBe(`<h1>Before <span>JSX version</span></h1>
    
`);
  });
});
