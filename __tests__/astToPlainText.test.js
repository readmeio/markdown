import { hast, astToPlainText } from '../index';

const find = (node, matcher) => {
  if (matcher(node)) return node;
  if (node.children) {
    return node.children.find(child => find(child, matcher));
  }

  return null;
};

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

    expect(astToPlainText(hast(txt))).toBe('📘 Title: Some body');
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
  2,
)}
[/block]
    `;

    expect(astToPlainText(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2 Cell 2.1');
  });

  it('converts images', () => {
    const txt = `
![image **label**](http://placekitten.com/600/600 "entitled kittens")
    `;

    expect(astToPlainText(hast(txt))).toBe('entitled kittens');
  });

  it('converts a single image', () => {
    const txt = `
![image **label**](http://placekitten.com/600/600 "entitled kittens")
    `;
    const ast = hast(txt);

    expect(astToPlainText(find(ast, n => n.tagName === 'img'))).toBe('entitled kittens');
  });

  it('converts magic block images', () => {
    const txt = `
      [block:image]
      {
        "images": [
          {
            "image": ["https://files.readme.io/test.png", "Test Image Title", 100, 100, "#fff"]
          }
        ]
      }
      [/block]
    `;

    expect(astToPlainText(hast(txt))).toBe('Test Image Title');
  });

  it('converts a lone magic block image', () => {
    const txt = `
      [block:image]
      {
        "images": [
          {
            "image": ["https://files.readme.io/test.png", "Test Image Title", 100, 100, "#fff"]
          }
        ]
      }
      [/block]
    `;
    const tree = hast(txt);
    const img = find(tree, n => n.tagName === 'img');

    expect(astToPlainText(img)).toBe('Test Image Title');
  });

  it('converts magic HTML blocks', () => {
    const tree = hast(`[block:html]
      {"html":"<p>Lorem <b>ipsum</b> dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>"}
    [/block]`);
    const text = astToPlainText(tree);
    expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
  });

  it('converts glossary terms', () => {
    const tree = hast('try the <<glossary:demo>>');
    const text = astToPlainText(tree);
    expect(text).toBe('try the demo');
  });

  it('converts ReadMe variables', () => {
    const vars = { user: { name: 'John Doe' }, defaults: [null] };
    const tree = hast('<<name>>');
    const text = astToPlainText(tree, { variables: vars });
    expect(text).toBe(vars.user.name);
  });

  it('strips style tags', () => {
    const tree = hast('<style>*{color:red!important}</style>\n\nLorem ipsum dolor sit amet.');
    const text = astToPlainText(tree);

    expect(text).not.toContain('*{color:red!important}');
    expect(text).toBe('Lorem ipsum dolor sit amet.');
  });
});
