import type {
  Blockquote,
  Code,
  Emphasis,
  List,
  ListItem,
  Paragraph,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from 'mdast';

import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { removePosition } from 'unist-util-remove-position';

import normalizeEmphasisAST from '../../processor/transform/mdxish/normalize-malformed-md-syntax';

const processor = remark().use(remarkParse).use(normalizeEmphasisAST);
const processorWithGfm = remark().use(remarkParse).use(remarkGfm).use(normalizeEmphasisAST);

describe('normalize-malformed-md-syntax', () => {
  describe('bold patterns with spaces', () => {
    it('should handle space after opening ** (with word before)', () => {
      const md = 'Hello** Wrong Bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Wrong Bold' }],
          },
        ],
      });
    });

    it('should preserve multiple spaces before opening **', () => {
      const md = 'Hello  ** World**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'World' }],
          },
        ],
      });
    });

    it('should handle space before closing **', () => {
      const md = '**text **word';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'text' }],
          },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = '** text **';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'text' }],
          },
        ],
      });
    });

    it('should handle multiple malformed bold patterns in one text', () => {
      const md = 'Start** first** middle** second **end';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      const strongNodes = children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'first' }],
      });
      expect(strongNodes[1]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'second' }],
      });
    });

    it('should handle complex case from migration tests', () => {
      const md = 'Move to **Hello**> **World **from the top left menu';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      const strongNodes = children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes.length).toBeGreaterThanOrEqual(1);
      const worldNode = strongNodes.find(
        (n): n is Strong =>
          n.type === 'strong' &&
          Array.isArray(n.children) &&
          n.children[0]?.type === 'text' &&
          n.children[0].value === 'World',
      );
      expect(worldNode).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'World' }],
      });
    });

    it('should handle case with word before and after', () => {
      const md = 'Find** Hello World** and click';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Find ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Hello World' }],
          },
          { type: 'text', value: ' and click' },
        ],
      });
    });
  });

  describe('underscore bold patterns with spaces', () => {
    it('should handle space after opening __ (with word before)', () => {
      const md = 'Hello__ Wrong Bold__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Wrong Bold' }],
          },
        ],
      });
    });

    it('should preserve multiple spaces before opening __', () => {
      const md = 'Hello  __ World__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'World' }],
          },
        ],
      });
    });

    it('should handle space before closing __', () => {
      const md = '__text __word';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'text' }],
          },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = '__ text __';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'text' }],
          },
        ],
      });
    });

    it('should handle multiple malformed bold patterns in one text', () => {
      const md = 'Start__ first__ middle__ second __end';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      const strongNodes = children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'first' }],
      });
      expect(strongNodes[1]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'second' }],
      });
    });

    it('should handle case with word before and after', () => {
      const md = 'Find__ Hello World__ and click';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Find ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Hello World' }],
          },
          { type: 'text', value: ' and click' },
        ],
      });
    });

    it('should handle mixed ** and __ patterns', () => {
      const md = 'Asterisk** first** Underscore__ second__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      const strongNodes = children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'first' }],
      });
      expect(strongNodes[1]).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'second' }],
      });
    });
  });

  describe('should not modify valid bold syntax', () => {
    it('should leave **valid** bold untouched', () => {
      const md = '**valid**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'valid' }],
          },
        ],
      });
    });

    it('should leave word**valid**bold untouched', () => {
      const md = 'word**valid**bold';
      const tree = processor.parse(md);
      processor.runSync(tree);

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      expect(children.length).toBeGreaterThanOrEqual(1);
    });

    it('should leave __valid__ bold untouched', () => {
      const md = '__valid__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'strong',
            children: [{ type: 'text', value: 'valid' }],
          },
        ],
      });
    });

    it('should leave word__valid__bold untouched', () => {
      const md = 'word__valid__bold';
      const tree = processor.parse(md);
      processor.runSync(tree);

      const paragraph = tree.children[0] as Paragraph;
      const children = paragraph.children;
      expect(children.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('should skip code blocks and inline code', () => {
    it('should not modify malformed bold inside inline code', () => {
      const md = '`** bold**`';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'inlineCode',
            value: '** bold**',
          },
        ],
      });
    });

    it('should not modify malformed bold with __ inside inline code', () => {
      const md = '`__ bold__`';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'inlineCode',
            value: '__ bold__',
          },
        ],
      });
    });

    it('should not modify malformed bold inside code blocks', () => {
      const md = '```\n** bold**\n```';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const codeBlock = tree.children[0] as Code;
      expect(codeBlock.type).toBe('code');
      expect(codeBlock.value).toContain('** bold**');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const md = '** **';
      const tree = processor.parse(md);
      processor.runSync(tree);

      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should handle newlines in content', () => {
      const md = '** text\nwith newline**';
      const tree = processor.parse(md);
      processor.runSync(tree);

      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should preserve text around malformed bold', () => {
      const md = 'Before Hello** Wrong Bold** After';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Wrong Bold' }],
      });
      expect(paragraph.children.length).toBeGreaterThanOrEqual(3);
    });

    it('should not add space when space is only before closing markers', () => {
      const md = 'Hello**bold **';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
          },
        ],
      });
    });

    it('should not add space for valid bold syntax', () => {
      const md = 'Hello**bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'bold' }],
      });
      const textNodes = paragraph.children.filter((c): c is Text => c.type === 'text');
      const helloText = textNodes.find(t => t.value.startsWith('Hello'));
      expect(helloText).toBeDefined();
      expect(helloText?.value).toBe('Hello');
    });
  });

  describe('italic patterns with spaces (asterisk)', () => {
    it('should handle space after opening * (with word before)', () => {
      const md = 'Hello* Wrong Italic*';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'Wrong Italic' }],
          },
        ],
      });
    });

    it('should preserve multiple spaces before opening *', () => {
      const md = 'Hello  * World*';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'World' }],
          },
        ],
      });
    });

    it('should handle space before closing *', () => {
      const md = '*text *word';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'text' }],
          },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = 'Before * text * after';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'text' }],
      });
    });

    it('should not add space when space is only before closing *', () => {
      const md = 'Hello*italic *';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'italic' }],
          },
        ],
      });
    });
  });

  describe('italic patterns with spaces (underscore)', () => {
    it('should handle space after opening _ (with word before)', () => {
      const md = 'Hello_ Wrong Italic_';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'Wrong Italic' }],
          },
        ],
      });
    });

    it('should preserve multiple spaces before opening _', () => {
      const md = 'Hello  _ World_';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'World' }],
          },
        ],
      });
    });

    it('should handle space before closing _', () => {
      const md = '_text _word';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'text' }],
          },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = 'Before _ text _ after';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'text' }],
      });
    });

    it('should not add space when space is only before closing _', () => {
      const md = 'Hello_italic _';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello' },
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'italic' }],
          },
        ],
      });
    });
  });

  describe('should not modify valid italic syntax', () => {
    it('should leave *valid* italic untouched', () => {
      const md = '*valid*';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'valid' }],
          },
        ],
      });
    });

    it('should leave _valid_ italic untouched', () => {
      const md = '_valid_';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [{ type: 'text', value: 'valid' }],
          },
        ],
      });
    });
  });

  describe('should not modify escaped markers', () => {
    it('should leave escaped underscore untouched', () => {
      const md = '\\_ not italic_';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toBeDefined();
      expect(emphasis?.children[0]).toStrictEqual({
        type: 'text',
        value: 'not italic',
      });
    });

    it('should leave escaped asterisk untouched', () => {
      const md = '\\* not bold*';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toBeDefined();
      expect(emphasis?.children[0]).toStrictEqual({
        type: 'text',
        value: 'not bold',
      });
    });

    it('should leave escaped double asterisk untouched', () => {
      const md = '\\*\\* not bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children[0]).toStrictEqual({
        type: 'text',
        value: 'not bold',
      });
    });

    it('should leave escaped double underscore untouched', () => {
      const md = '\\_\\_ not bold__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children[0]).toStrictEqual({
        type: 'text',
        value: 'not bold',
      });
    });

    it('should handle multiple escaped markers', () => {
      const md = 'Text with \\* asterisk and \\_ underscore and \\*\\* double asterisk';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.children.length).toBeGreaterThan(0);
      const textNodes = paragraph.children.filter((c): c is Text => c.type === 'text');
      const allText = textNodes.map(t => t.value).join('');
      expect(allText.length).toBeGreaterThan(0);
    });
  });

  describe('malformed syntax in callouts', () => {
    it('should handle malformed bold in callout content', () => {
      const md = '> 👍 Success\n>\n> This is ** Wrong Bold** text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      expect(blockquote.type).toBe('blockquote');
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Wrong Bold' }],
      });
    });

    it('should handle malformed italic in callout content', () => {
      const md = '> 📘 Info\n>\n> This is * Wrong Italic* text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      expect(blockquote.type).toBe('blockquote');
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'Wrong Italic' }],
      });
    });

    it('should handle malformed bold with word before in callout', () => {
      const md = '> ⚠️ Warning\n>\n> Find** Hello World** and click';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      expect(blockquote.type).toBe('blockquote');
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Hello World' }],
      });
    });

    it('should handle multiple malformed patterns in callout', () => {
      const md = '> ❗ Error\n>\n> Start** first** middle* second *end';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      expect(blockquote.type).toBe('blockquote');
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');
      const emphasisNodes = paragraph.children.filter((c): c is Emphasis => c.type === 'emphasis');

      expect(strongNodes.length).toBeGreaterThanOrEqual(1);
      expect(emphasisNodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('malformed syntax in tables', () => {
    it('should handle malformed bold in table cells', () => {
      const md = '| Header |\n|--------|\n| ** Wrong Bold** |';
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      expect(table.type).toBe('table');
      const row = table.children[1] as TableRow;
      expect(row.type).toBe('tableRow');
      const cell = row.children[0] as TableCell;
      expect(cell.type).toBe('tableCell');
      const strong = cell.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Wrong Bold' }],
      });
    });

    it('should handle malformed italic in table cells', () => {
      const md = '| Header |\n|--------|\n| * Wrong Italic* |';
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      expect(table.type).toBe('table');
      const row = table.children[1] as TableRow;
      expect(row.type).toBe('tableRow');
      const cell = row.children[0] as TableCell;
      expect(cell.type).toBe('tableCell');
      const emphasis = cell.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'Wrong Italic' }],
      });
    });

    it('should handle malformed bold with word before in table cell', () => {
      const md = '| Column |\n|--------|\n| Find** Hello** text |';
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      expect(table.type).toBe('table');
      const row = table.children[1] as TableRow;
      expect(row.type).toBe('tableRow');
      const cell = row.children[0] as TableCell;
      expect(cell.type).toBe('tableCell');
      const strong = cell.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Hello' }],
      });
    });

    it('should handle malformed syntax in multiple table cells', () => {
      const md = '| Col1 | Col2 |\n|------|------|\n| ** Bold** | * Italic* |';
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      expect(table.type).toBe('table');
      const row = table.children[1] as TableRow;
      expect(row.type).toBe('tableRow');
      const cells = row.children.filter((c): c is TableCell => c.type === 'tableCell');
      expect(cells.length).toBeGreaterThanOrEqual(2);

      const firstCell = cells[0];
      const strong = firstCell.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toBeDefined();

      const secondCell = cells[1];
      const emphasis = secondCell.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasis).toBeDefined();
    });
  });

  describe('malformed syntax in lists', () => {
    it('should handle malformed bold in list items', () => {
      const md = '- Item with ** Wrong Bold** text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const list = tree.children[0] as List;
      expect(list.type).toBe('list');
      const listItem = list.children[0] as ListItem;
      expect(listItem.type).toBe('listItem');
      const paragraph = listItem.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Wrong Bold' }],
      });
    });

    it('should handle malformed italic in list items', () => {
      const md = '- Item with * Wrong Italic* text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const list = tree.children[0] as List;
      expect(list.type).toBe('list');
      const listItem = list.children[0] as ListItem;
      expect(listItem.type).toBe('listItem');
      const paragraph = listItem.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'Wrong Italic' }],
      });
    });

    it('should handle malformed syntax in nested list items', () => {
      const md = '- Outer\n  - Inner with ** Wrong Bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const list = tree.children[0] as List;
      expect(list.type).toBe('list');
      const outerItem = list.children[0] as ListItem;
      expect(outerItem.type).toBe('listItem');
      expect(outerItem.children.length).toBeGreaterThan(1);
      const nestedList = outerItem.children[1] as List;
      expect(nestedList.type).toBe('list');
      const innerItem = nestedList.children[0] as ListItem;
      expect(innerItem.type).toBe('listItem');
      const paragraph = innerItem.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'Wrong Bold' }],
      });
    });
  });

  describe('edge cases with nested syntax', () => {
    it('should have malformed italic inside valid bold', () => {
      const md = '**Bold with _ malformed italic_ inside**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      // Should have valid bold
      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThan(0);
      // The malformed italic inside should be processed into an emphasis node
      const emphasisInside = strong?.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasisInside).toBeDefined();
      expect(emphasisInside?.children[0]).toStrictEqual({
        type: 'text',
        value: 'malformed italic',
      });
    });

    it('should handle malformed bold with snake_case content', () => {
      const md = '** some_snake_case**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'some_snake_case' }],
      });
    });

    it('should handle malformed bold with multiple underscores in content', () => {
      const md = '** some_snake_case_with_many_underscores**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'some_snake_case_with_many_underscores' }],
      });
    });

    it('should handle malformed italic with snake_case content', () => {
      const md = 'Text with * some_snake_case* here';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toStrictEqual({
        type: 'emphasis',
        children: [{ type: 'text', value: 'some_snake_case' }],
      });
    });

    it('should handle malformed bold with word before and snake_case content', () => {
      const md = 'Find** some_snake_case** and click';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Find ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'some_snake_case' }],
          },
          { type: 'text', value: ' and click' },
        ],
      });
    });

    it('should handle malformed underscore italic inside valid asterisk bold', () => {
      const md = '**Bold with _ malformed_ inside**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThan(0);
      const emphasisInside = strong?.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasisInside).toBeDefined();
      expect(emphasisInside?.children[0]).toStrictEqual({
        type: 'text',
        value: 'malformed',
      });
    });

    it('should handle malformed bold with mixed underscores and spaces', () => {
      const md = '** some_snake_case with spaces**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toStrictEqual({
        type: 'strong',
        children: [{ type: 'text', value: 'some_snake_case with spaces' }],
      });
    });

    it('should handle malformed bold with underscore in word before', () => {
      const md = 'some_word** Bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'some_word ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'Bold' }],
          },
        ],
      });
    });
  });
});
