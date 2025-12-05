import type { Element } from 'hast';

import { mdast, mdx, mdxish } from '../../index';

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
});
