import { mdast, hast } from '../../index';

describe('Parse magic block tables', () => {
  it('renders an table with missing cells', () => {
    const text = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-1': 'Header 1',
      '0-0': 'Cell A 1',
    },
    cols: 2,
    rows: 2,
  },
  null,
  2,
)}
[/block]
    `;

    expect(mdast(text)).toMatchSnapshot();
  });
});

describe('GFM style tables', () => {
  it('renders a table with invalid html in code tags', () => {
    const md = `
| Alpha     | Beta                   |
| :-------- | :--------------------- |
| \`<valid>\` | <code><invalid></code> |
`;

    const tree = hast(md);

    expect(tree.children[1].tagName).toBe('table');
  });
});
