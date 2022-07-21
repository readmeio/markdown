import { hast, astToPlainText } from '../index';

describe('astToPlainText()', () => {
  it("converts br's to ''", () => {
    const txt = '<br>';

    expect(astToPlainText(hast(txt))).toBe('');
  });

  it("converts hr's to ''", () => {
    const txt = '<hr>';

    expect(astToPlainText(hast(txt))).toBe('');
  });

  it('converts flavored callouts', () => {
    const txt = `
> 📘 Title
>
> Some body
    `;

    expect(astToPlainText(hast(txt))).toBe('Title Some body');
  });

  it('converts markdown tables', () => {
    const txt = `
| Header 1 | Header 2 |
| :------- | :------- |
| Cell 1   | Cell 2   |
    `;

    expect(astToPlainText(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2');
  });

  it('converts magic block tables', () => {
    const txt = `
[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Header 1',
      'h-1': 'Header 2',
      '0-0': 'Cell 1',
      '0-1': 'Cell 2  \nCell 2.1',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left', 'left'],
  },
  null,
  2
)}
[/block]
    `;

    expect(astToPlainText(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2  \nCell 2.1');
  });

  it('converts images', () => {
    const txt = `
![image **label**](http://placekitten.com/600/600)
    `;

    expect(astToPlainText(hast(txt))).toBe('');
  });
});
