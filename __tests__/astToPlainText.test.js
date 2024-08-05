import { dim, magenta } from 'chalk'; // eslint-disable-line unicorn/import-style

import { hast, astToPlainText } from '../index';

const find = (node, matcher) => {
  if (matcher(node)) return node;
  if (node.children) {
    return node.children.find(child => find(child, matcher));
  }

  return null;
};

const wordsOnly = (str, rgx) =>
  str
    .replace(typeof rgx === 'string' ? new RegExp(`[^\\w${rgx}]`, 'g') : rgx || /\W/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('Plain Text Serialization', () => {
  describe('RDMD Syntax', () => {
    it('tables', () => {
      const txt = `
  | Header 1 | Header 2 |
  | :------- | :------- |
  | Cell 1   | Cell 2   |
      `;

      expect(astToPlainText(hast(txt))).toBe('Header 1 Header 2 Cell 1 Cell 2');
    });

    it('images', () => {
      const body = `
  ![image **label**](http://placekitten.com/600/600 "entitled kittens")
      `;
      const tree = hast(body);
      const elem = find(tree, n => n.tagName === 'img');

      expect(astToPlainText(tree)).toBe('entitled kittens');
      expect(astToPlainText(elem)).toBe('entitled kittens');
    });

    it('glossary terms', () => {
      const tree = hast('try the <<glossary:demo>>');
      const text = astToPlainText(tree);
      expect(text).toBe('try the demo');
    });

    it('variables', () => {
      const vars = { user: { name: 'John Doe' }, defaults: [null] };
      const tree = hast('<<name>>');
      const text = astToPlainText(tree, { variables: vars });
      expect(text).toBe(vars.user.name);
    });

    describe.each([
      ['title', 'simple body'],
      ['title (no body)'],
      ['', 'simple body (no title)'],
      ['title', 'complex|multi\n> ---|---\n> child|body'],
      ['', 'complex|body\n> ---|---\n> (no|title)'],
    ])(`${magenta('↓')} ${dim('callouts:')}`, (...args) => {
      // construct the callout syntax
      const body = `> 👍 ${args.join('\n> ')}`;

      const tree = hast(body);
      const text = astToPlainText(tree);
      const name = wordsOnly(text, ':()').replace(': ', ' w/');

      it(`${name}`, () => {
        // ensure syntax input matches plaintext output (words only)
        const [is, ought] = [body, text].map(x => wordsOnly(x));
        expect(is).toBe(ought);
      });
    });
  });

  describe('Magic Blocks', () => {
    it('table blocks', () => {
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

    it('image blocks', () => {
      const body = `
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
      const tree = hast(body);
      const elem = find(tree, n => n.tagName === 'img');

      expect(astToPlainText(tree)).toBe('Test Image Title');
      expect(astToPlainText(elem)).toBe('Test Image Title');
    });

    it('custom HTML blocks', () => {
      const tree = hast(`[block:html]
        {"html":"<p>Lorem <b>ipsum</b> dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>"}
      [/block]`);
      const text = astToPlainText(tree);
      expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
    });
  });

  describe('HTML Markup', () => {
    it('strips <br> tags', () => {
      const txt = '<br>';

      expect(astToPlainText(hast(txt))).toBe('');
    });

    it('strips <hr> tags', () => {
      const txt = '<hr>';

      expect(astToPlainText(hast(txt))).toBe('');
    });

    it('strips <style> tags', () => {
      const tree = hast('<style>*{color:red!important}</style>\n\nLorem ipsum dolor sit amet.');
      const text = astToPlainText(tree);

      expect(text).not.toContain('*{color:red!important}');
      expect(text).toBe('Lorem ipsum dolor sit amet.');
    });
  });
});
