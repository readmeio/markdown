import { html } from '../index';

describe('html(doc, { mdx: true })', () => {
  it('parses basic content', () => {
    const doc = `
# Heading

<h1>JSX version</h1>
    `;

    const string = html(doc, { mdx: true });

    expect(string).toBe(`<h1 id="heading">Heading</h1>
&#x3C;h1>JSX version&#x3C;/h1>
    `);
  });
});
