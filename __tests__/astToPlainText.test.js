import { hast, mdast, astToPlainText } from '../index';

describe('astToPlainText()', () => {
  it("converts br's to ''", () => {
    const txt = `<br>`;

    expect(astToPlainText(hast(txt))).toBe('');
  });

  it("converts hr's to ''", () => {
    const txt = `<hr>`;

    expect(astToPlainText(hast(txt))).toBe('');
  });

  it('converts flavored callouts', () => {
    const txt = `
> 📘 Title
> 
> Some body
    `;

    expect(astToPlainText(mdast(txt))).toBe('Title Some body');
  });
});
