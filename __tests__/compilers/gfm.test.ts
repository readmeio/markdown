import type { Element } from 'hast';

import { toHtml } from 'hast-util-to-html';

import { mdast, mdx, mdxish } from '../../index';
import { collectNodes, findElementByTagName, parseMdxishWithSlices, roundTripMdxish } from '../helpers';

describe('GFM strikethrough', () => {
  describe('mdx compiler', () => {
    it('compiles single strikethrough to markdown syntax', () => {
      const markdown = 'This is ~~strikethrough~~ text';
      expect(mdx(mdast(markdown))).toContain('~~');
    });

    it('compiles multiple strikethrough instances to markdown syntax', () => {
      const markdown = '~~one~~ and ~~two~~';
      expect(mdx(mdast(markdown))).toContain('~~');
    });

    it('compiles strikethrough with other formatting to markdown syntax', () => {
      const markdown = 'Text with ~~strike~~ and **bold**';
      expect(mdx(mdast(markdown))).toContain('~~');
    });
  });

  describe('mdxish compiler', () => {
    it('processes single strikethrough', () => {
      const markdown = 'This is ~~strikethrough~~ text';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;

      expect(paragraph.type).toBe('element');
      expect(paragraph.tagName).toBe('p');

      const deletions = paragraph.children.filter(
        child => child.type === 'element' && child.tagName === 'del',
      ) as Element[];

      expect(deletions.length).toBeGreaterThan(0);
      deletions.forEach(deletion => {
        expect(deletion.tagName).toBe('del');
      });
    });

    it('processes multiple strikethrough instances', () => {
      const markdown = '~~one~~ and ~~two~~';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;
      const deletions = paragraph.children.filter(
        child => child.type === 'element' && child.tagName === 'del',
      ) as Element[];

      expect(deletions).toHaveLength(2);
    });

    it('processes strikethrough with other formatting', () => {
      const markdown = 'Text with ~~strike~~ and **bold**';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;
      const deletions = paragraph.children.filter(
        child => child.type === 'element' && child.tagName === 'del',
      ) as Element[];

      expect(deletions.length).toBeGreaterThan(0);
    });
  });
});

describe('GFM task lists', () => {
  describe('mdx compiler', () => {
    it('compiles basic task list with checked and unchecked items to markdown syntax', () => {
      const markdown = '- [ ] unchecked\n- [x] checked';
      const output = mdx(mdast(markdown));
      // remark-stringify normalizes list markers to *
      expect(output).toContain('* [ ]');
      expect(output).toContain('* [x]');
    });

    it('compiles nested task lists to markdown syntax', () => {
      const markdown = '- [ ] parent\n  - [x] child';
      const output = mdx(mdast(markdown));
      expect(output).toContain('* [ ]');
      expect(output).toContain('* [x]');
    });

    it('compiles multiple task list items to markdown syntax', () => {
      const markdown = '- [x] done\n- [ ] todo\n- [x] also done';
      const output = mdx(mdast(markdown));
      expect(output).toContain('* [ ]');
      expect(output).toContain('* [x]');
    });
  });

  describe('mdxish compiler', () => {
    it('processes basic task list with checked and unchecked items', () => {
      const markdown = '- [ ] unchecked\n- [x] checked';
      const hast = mdxish(markdown);
      const list = hast.children[0] as Element;

      expect(list.type).toBe('element');
      expect(list.tagName).toBe('ul');
      expect(list.properties?.className).toContain('contains-task-list');

      const listItems = list.children.filter(child => child.type === 'element' && child.tagName === 'li') as Element[];

      expect(listItems).toHaveLength(2);

      // Verify task list items have checkboxes
      listItems.forEach(item => {
        expect(item.properties?.className).toContain('task-list-item');
        const checkbox = item.children.find(child => child.type === 'element' && child.tagName === 'input') as
          | Element
          | undefined;
        expect(checkbox).toBeDefined();
        expect(checkbox?.properties?.type).toBe('checkbox');
      });
    });

    it('processes nested task lists', () => {
      const markdown = '- [ ] parent\n  - [x] child';
      const hast = mdxish(markdown);
      const list = hast.children[0] as Element;

      expect(list.tagName).toBe('ul');
      expect(list.properties?.className).toContain('contains-task-list');

      const listItems = list.children.filter(child => child.type === 'element' && child.tagName === 'li') as Element[];

      expect(listItems.length).toBeGreaterThanOrEqual(1);

      const parentItem = listItems[0];
      expect(parentItem.properties?.className).toContain('task-list-item');

      const nestedList = parentItem.children.find(child => child.type === 'element' && child.tagName === 'ul') as
        | Element
        | undefined;
      expect(nestedList).toBeDefined();
      expect(nestedList?.properties?.className).toContain('contains-task-list');
    });

    it('processes multiple task list items', () => {
      const markdown = '- [x] done\n- [ ] todo\n- [x] also done';
      const hast = mdxish(markdown);
      const list = hast.children[0] as Element;

      expect(list.tagName).toBe('ul');
      expect(list.properties?.className).toContain('contains-task-list');

      const listItems = list.children.filter(child => child.type === 'element' && child.tagName === 'li') as Element[];

      expect(listItems).toHaveLength(3);
    });
  });
});

describe('GFM autolinks', () => {
  describe('mdx compiler', () => {
    it('compiles URL autolink to markdown syntax', () => {
      const markdown = 'Visit https://example.com for more info';
      const output = mdx(mdast(markdown));
      expect(output).toContain('https://example.com');
    });

    it('compiles email autolink to markdown syntax', () => {
      const markdown = 'Contact us at test@example.com';
      const output = mdx(mdast(markdown));
      expect(output).toContain('test@example.com');
    });

    it('compiles multiple URL autolinks to markdown syntax', () => {
      const markdown = 'See http://example.org and https://test.com';
      const output = mdx(mdast(markdown));
      expect(output).toContain('http://example.org');
    });
  });

  describe('mdxish compiler', () => {
    it('processes URL autolink', () => {
      const markdown = 'Visit https://example.com for more info';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;

      const link = paragraph.children.find(child => child.type === 'element' && child.tagName === 'a') as
        | Element
        | undefined;

      expect(link).toBeDefined();
      expect(link?.properties?.href).toBe('https://example.com');

      const textNode = link?.children.find(child => child.type === 'text');
      expect(textNode && 'value' in textNode && textNode.value).toBe('https://example.com');
    });

    it('processes email autolink', () => {
      const markdown = 'Contact us at test@example.com';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;

      const link = paragraph.children.find(child => child.type === 'element' && child.tagName === 'a') as
        | Element
        | undefined;

      expect(link).toBeDefined();
      expect(link?.properties?.href).toBe('mailto:test@example.com');
    });

    it('processes multiple URL autolinks', () => {
      const markdown = 'See http://example.org and https://test.com';
      const hast = mdxish(markdown);
      const paragraph = hast.children[0] as Element;

      const links = paragraph.children.filter(child => child.type === 'element' && child.tagName === 'a') as Element[];

      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0]?.properties?.href).toBe('http://example.org');
    });
  });
});

describe('GFM footnotes', () => {
  describe('mdx compiler', () => {
    it('compiles single footnote to markdown syntax', () => {
      const markdown = 'Text with footnote[^1]\n\n[^1]: Footnote definition';
      const output = mdx(mdast(markdown));
      expect(output).toContain('[^1]');
      expect(output).toContain('Footnote definition');
    });

    it('compiles multiple footnotes to markdown syntax', () => {
      const markdown = 'First[^1] and second[^2]\n\n[^1]: First note\n[^2]: Second note';
      const output = mdx(mdast(markdown));
      expect(output).toContain('[^1]');
      expect(output).toContain('[^2]');
    });
  });

  describe('mdxish compiler', () => {
    it('processes single footnote', () => {
      const markdown = 'Text with footnote[^1]\n\n[^1]: Footnote definition';
      const hast = mdxish(markdown);

      const paragraph = hast.children.find(child => child.type === 'element' && child.tagName === 'p') as
        | Element
        | undefined;
      expect(paragraph).toBeDefined();

      const footnoteRef = paragraph?.children.find(child => child.type === 'element' && child.tagName === 'sup') as
        | Element
        | undefined;
      expect(footnoteRef).toBeDefined();

      const footnoteDef = hast.children.find(child => child.type === 'element' && child.tagName === 'section') as
        | Element
        | undefined;
      expect(footnoteDef).toBeDefined();
    });

    it('processes multiple footnotes', () => {
      const markdown = 'First[^1] and second[^2]\n\n[^1]: First note\n[^2]: Second note';
      const hast = mdxish(markdown);

      const paragraph = hast.children.find(child => child.type === 'element' && child.tagName === 'p') as
        | Element
        | undefined;
      expect(paragraph).toBeDefined();

      const footnoteRefs = paragraph?.children.filter(child => child.type === 'element' && child.tagName === 'sup') as
        | Element[]
        | undefined;

      expect(footnoteRefs?.length).toBeGreaterThanOrEqual(2);

      const footnoteDef = hast.children.find(child => child.type === 'element' && child.tagName === 'section') as
        | Element
        | undefined;
      expect(footnoteDef).toBeDefined();
    });
  });

  // RM-16727: tables are re-parsed on their own, away from the page's footnote definitions.
  // Pipe tables never reach that re-parse, so these use `<Table>` / `<table>`.
  describe('mdxish compiler in a table cell', () => {
    const table = (cell: string, tag = 'Table') =>
      [
        `<${tag}>`,
        '  <thead>',
        '    <tr><th>H</th></tr>',
        '  </thead>',
        '  <tbody>',
        '    <tr>',
        `      <td>${cell}</td>`,
        '    </tr>',
        '  </tbody>',
        `</${tag}>`,
      ].join('\n');
    const withNote = (body: string, label = '1') => `${body}\n\n[^${label}]: A note.`;
    const cellOf = (md: string) => toHtml(findElementByTagName(mdxish(md), 'td')!);
    const footnotesOf = (md: string) => findElementByTagName(mdxish(md), 'section');

    it.each([
      ['a JSX <Table>', withNote(table('Example[^1]'))],
      ['a lowercase <table>', withNote(table('Example[^1]', 'table'))],
      ['a cell mixing markdown and a reference', withNote(table('**b**[^1]'))],
      ['a mixed-case label', withNote(table('Example[^Note]'), 'note')],
      ['a cell after a blank line', withNote(table('\n\nExample[^1]\n\n'))],
      // mdxjs rejects the lone `{` and no repair fixes it, so this goes through the fallback parse.
      [
        'a lowercase <table> mdxjs rejects',
        withNote(table('\n\nExample[^1]\n\n</td>\n    </tr>\n    <tr>\n      <td>{', 'table')),
      ],
    ])('links the reference in %s', (_, md) => {
      expect(cellOf(md)).toMatch(/<sup><a href="#user-content-fn-\w+" id="user-content-fnref-\w+" data-footnote-ref/);
      expect(toHtml(footnotesOf(md)!)).toContain('A note.');
    });

    it.each([
      ['an undefined label', withNote(table('Example[^2]')), 'Example[^2]'],
      // Mixed so the cell isn't re-parsed from its unescaped text.
      ['an escaped reference', withNote(table('Example\\[^1] *em*')), 'Example[^1] <em>em</em>'],
    ])('keeps %s as text', (_, md, text) => {
      expect(cellOf(md)).toBe(`<td>${text}</td>`);
    });

    // Nothing is added to the cell's source, so an unterminated fence has nothing to swallow.
    it('renders an unterminated fence in a cell the same with or without footnotes', () => {
      const md = table('```js\nconst a = 1;');
      expect(cellOf(withNote(md))).toBe(cellOf(md));
    });

    // The table processors are cached per label set, so a later page must not reuse an earlier page's labels.
    it('links each page against its own definitions', () => {
      expect(cellOf(withNote(table('Example[^a]'), 'a'))).toContain('data-footnote-ref');
      expect(cellOf(withNote(table('Example[^a]'), 'b'))).toBe('<td>Example[^a]</td>');
    });

    // Unlinked, the editor would save the reference as an escaped `\\[^1]`.
    it('saves the reference unescaped', () => {
      const md = withNote(table('Example[^1]'));
      expect(roundTripMdxish(md, { newEditorTypes: true })).toContain('| Example[^1] |');
    });

    it('positions the reference on the page', () => {
      const { tree, sliceOf } = parseMdxishWithSlices(withNote(table('**b**[^1]')));
      expect(collectNodes(tree, 'footnoteReference').map(sliceOf)).toStrictEqual(['[^1]']);
    });
  });
});
