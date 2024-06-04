import { hast, plain } from '../../index';

describe('plain compiler', () => {
  it('returns plain text of markdown components', () => {
    const md = `
## Hello!

Is it _me_ you're looking for?
`;

    const tree = hast(md);
    expect(plain(tree)).toEqual("Hello! Is it me you're looking for?");
  });

  it("converts br's to ''", () => {
    const txt = '<br />';

    expect(plain(hast(txt))).toBe('');
  });

  it("converts hr's to ''", () => {
    const txt = '<hr />';

    expect(plain(hast(txt))).toBe('');
  });

  it('converts callouts', () => {
    const txt = `
> 📘 Title
>
> Some body
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('Title Some body');
  });

  it('converts markdown tables', () => {
    const txt = `
| Header 1 | Header 2 |
| :------- | :------- |
| Cell 1   | Cell 2   |
    `;

    expect(plain(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2');
  });

  it('converts images to their title', () => {
    const txt = `
![image **label**](http://placekitten.com/600/600 "entitled kittens")
    `;
    const tree = hast(txt);

    expect(plain(tree)).toBe('entitled kittens');
  });
});
