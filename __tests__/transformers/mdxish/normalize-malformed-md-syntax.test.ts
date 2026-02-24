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

import normalizeEmphasisAST from '../../../processor/transform/mdxish/normalize-malformed-md-syntax';

const processor = remark().use(remarkParse).use(normalizeEmphasisAST);
const processorWithGfm = remark().use(remarkParse).use(remarkGfm).use(normalizeEmphasisAST);

// Test data for parameterized tests
const boldMarkers = [
  { marker: '**', name: 'asterisk' },
  { marker: '__', name: 'underscore' },
] as const;

const italicMarkers = [
  { marker: '*', name: 'asterisk' },
  { marker: '_', name: 'underscore' },
] as const;

describe('normalize-malformed-md-syntax', () => {
  describe.each(boldMarkers)('bold patterns with $name ($marker)', ({ marker }) => {
    it('should handle space after opening marker (with word before)', () => {
      const md = `Hello${marker} Wrong Bold${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          { type: 'strong', children: [{ type: 'text', value: 'Wrong Bold' }] },
        ],
      });
    });

    it('should preserve multiple spaces before opening marker', () => {
      const md = `Hello  ${marker} World${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          { type: 'strong', children: [{ type: 'text', value: 'World' }] },
        ],
      });
    });

    it('should handle space before closing marker', () => {
      const md = `${marker}text ${marker}word`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'text' }] },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = `${marker} text ${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'strong', children: [{ type: 'text', value: 'text' }] }],
      });
    });

    it('should handle multiple malformed patterns in one text', () => {
      const md = `Start${marker} first${marker} middle${marker} second ${marker}end`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'first' }] });
      expect(strongNodes[1]).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'second' }] });
    });

    it('should handle case with word before and after', () => {
      const md = `Find${marker} Hello World${marker} and click`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Find ' },
          { type: 'strong', children: [{ type: 'text', value: 'Hello World' }] },
          { type: 'text', value: ' and click' },
        ],
      });
    });

    it('should leave valid bold untouched', () => {
      const md = `${marker}valid${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'strong', children: [{ type: 'text', value: 'valid' }] }],
      });
    });
  });

  describe.each(italicMarkers)('italic patterns with $name ($marker)', ({ marker }) => {
    it('should handle space after opening marker (with word before)', () => {
      const md = `Hello${marker} Wrong Italic${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'Wrong Italic' }] },
        ],
      });
    });

    it('should preserve multiple spaces before opening marker', () => {
      const md = `Hello  ${marker} World${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello  ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'World' }] },
        ],
      });
    });

    it('should handle space before closing marker', () => {
      const md = `${marker}text ${marker}word`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'emphasis', children: [{ type: 'text', value: 'text' }] },
          { type: 'text', value: ' w' },
          { type: 'text', value: 'ord' },
        ],
      });
    });

    it('should handle spaces on both sides', () => {
      const md = `Before ${marker} text ${marker} after`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasis).toStrictEqual({ type: 'emphasis', children: [{ type: 'text', value: 'text' }] });
    });

    it('should not add space when space is only before closing marker', () => {
      const md = `Hello${marker}italic ${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Hello' },
          { type: 'emphasis', children: [{ type: 'text', value: 'italic' }] },
        ],
      });
    });

    it('should leave valid italic untouched', () => {
      const md = `${marker}valid${marker}`;
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'emphasis', children: [{ type: 'text', value: 'valid' }] }],
      });
    });
  });

  describe('asterisk-specific bold patterns', () => {
    it.each([
      ['** bold**!', 'no trailing space', '!'],
      ['** bold **!', 'trailing space', ' !'],
    ])('should handle punctuation after closing markers (%s)', (md, _desc, expectedAfter) => {
      const tree = processor.parse(`This is ${md}`);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'bold' }] });

      const lastChild = paragraph.children[paragraph.children.length - 1] as Text;
      expect(lastChild.value).toBe(expectedAfter);
    });

    it('should handle escaped asterisk in content', () => {
      const md = 'This is ** bo\\*ld**!';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'bo*ld' }] });
    });

    it('should handle complex case from migration tests', () => {
      const md = 'Move to **Hello**> **World **from the top left menu';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');
      const worldNode = strongNodes.find(n => n.children[0]?.type === 'text' && n.children[0].value === 'World');
      expect(worldNode).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'World' }] });
    });
  });

  describe('mixed marker patterns', () => {
    it('should handle mixed ** and __ patterns', () => {
      const md = 'Asterisk** first** Underscore__ second__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'first' }] });
      expect(strongNodes[1]).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'second' }] });
    });
  });

  describe('code blocks and inline code', () => {
    it.each([
      ['`** bold**`', '** bold**', 'asterisk bold in inline code'],
      ['`__ bold__`', '__ bold__', 'underscore bold in inline code'],
    ])('should not modify %s', (md, expectedValue) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'inlineCode', value: expectedValue }],
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
    it.each([
      ['** **', 'empty content'],
      ['** text\nwith newline**', 'newlines in content'],
    ])('should handle %s', md => {
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
      expect(strong).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'Wrong Bold' }] });
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
          { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
        ],
      });
    });

    it('should not add space for valid bold syntax', () => {
      const md = 'Hello**bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const textNodes = paragraph.children.filter((c): c is Text => c.type === 'text');
      const helloText = textNodes.find(t => t.value.startsWith('Hello'));
      expect(helloText?.value).toBe('Hello');
    });
  });

  describe('escaped markers', () => {
    it.each([
      ['\\_ not italic_', 'emphasis', 'not italic', 'underscore'],
      ['\\* not bold*', 'emphasis', 'not bold', 'asterisk'],
      ['\\*\\* not bold**', 'strong', 'not bold', 'double asterisk'],
      ['\\_\\_ not bold__', 'strong', 'not bold', 'double underscore'],
    ])('should leave escaped %s untouched', (md, nodeType, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const node = paragraph.children.find(c => c.type === nodeType);
      expect(node).toBeDefined();
      expect((node as Emphasis | Strong)?.children[0]).toStrictEqual({ type: 'text', value: expectedContent });
    });

    it('should handle multiple escaped markers', () => {
      const md = 'Text with \\* asterisk and \\_ underscore and \\*\\* double asterisk';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.children.length).toBeGreaterThan(0);
    });
  });

  describe('malformed syntax in callouts', () => {
    it.each([
      ['> 👍 Success\n>\n> This is ** Wrong Bold** text', 'strong', 'Wrong Bold'],
      ['> 📘 Info\n>\n> This is * Wrong Italic* text', 'emphasis', 'Wrong Italic'],
      ['> ⚠️ Warning\n>\n> Find** Hello World** and click', 'strong', 'Hello World'],
    ])('should handle malformed emphasis in callout (%s)', (md, nodeType, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      expect(blockquote.type).toBe('blockquote');
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const node = paragraph.children.find(c => c.type === nodeType);
      expect((node as Emphasis | Strong)?.children[0]).toStrictEqual({ type: 'text', value: expectedContent });
    });

    it('should handle multiple malformed patterns in callout', () => {
      const md = '> ❗ Error\n>\n> Start** first** middle* second *end';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      const paragraph = blockquote.children[blockquote.children.length - 1] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');
      const emphasisNodes = paragraph.children.filter((c): c is Emphasis => c.type === 'emphasis');

      expect(strongNodes.length).toBeGreaterThanOrEqual(1);
      expect(emphasisNodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('malformed syntax in tables', () => {
    it.each([
      ['| Header |\n|--------|\n| ** Wrong Bold** |', 'strong', 'Wrong Bold'],
      ['| Header |\n|--------|\n| * Wrong Italic* |', 'emphasis', 'Wrong Italic'],
      ['| Column |\n|--------|\n| Find** Hello** text |', 'strong', 'Hello'],
    ])('should handle malformed emphasis in table cells', (md, nodeType, expectedContent) => {
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      const row = table.children[1] as TableRow;
      const cell = row.children[0] as TableCell;
      const node = cell.children.find(c => c.type === nodeType);
      expect((node as Emphasis | Strong)?.children[0]).toStrictEqual({ type: 'text', value: expectedContent });
    });

    it('should handle malformed syntax in multiple table cells', () => {
      const md = '| Col1 | Col2 |\n|------|------|\n| ** Bold** | * Italic* |';
      const tree = processorWithGfm.parse(md);
      processorWithGfm.runSync(tree);
      removePosition(tree, { force: true });

      const table = tree.children[0] as Table;
      const row = table.children[1] as TableRow;
      const cells = row.children.filter((c): c is TableCell => c.type === 'tableCell');

      expect(cells[0].children.find(c => c.type === 'strong')).toBeDefined();
      expect(cells[1].children.find(c => c.type === 'emphasis')).toBeDefined();
    });
  });

  describe('malformed syntax in lists', () => {
    it.each([
      ['- Item with ** Wrong Bold** text', 'strong', 'Wrong Bold'],
      ['- Item with * Wrong Italic* text', 'emphasis', 'Wrong Italic'],
    ])('should handle malformed emphasis in list items', (md, nodeType, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const list = tree.children[0] as List;
      const listItem = list.children[0] as ListItem;
      const paragraph = listItem.children[0] as Paragraph;
      const node = paragraph.children.find(c => c.type === nodeType);
      expect((node as Emphasis | Strong)?.children[0]).toStrictEqual({ type: 'text', value: expectedContent });
    });

    it('should handle malformed syntax in nested list items', () => {
      const md = '- Outer\n  - Inner with ** Wrong Bold**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const list = tree.children[0] as List;
      const outerItem = list.children[0] as ListItem;
      const nestedList = outerItem.children[1] as List;
      const innerItem = nestedList.children[0] as ListItem;
      const paragraph = innerItem.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: 'Wrong Bold' }] });
    });
  });

  describe('nested syntax edge cases', () => {
    it.each([
      ['**Bold with _ malformed italic_ inside**', 'malformed italic'],
      ['**Bold with _ malformed_ inside**', 'malformed'],
    ])('should handle malformed italic inside valid bold (%s)', (md, expectedItalicContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toBeDefined();
      const emphasisInside = strong?.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasisInside?.children[0]).toStrictEqual({ type: 'text', value: expectedItalicContent });
    });

    it.each([
      ['** some_snake_case**', 'some_snake_case'],
      ['** some_snake_case_with_many_underscores**', 'some_snake_case_with_many_underscores'],
      ['** some_snake_case with spaces**', 'some_snake_case with spaces'],
    ])('should handle malformed bold with snake_case content (%s)', (md, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toStrictEqual({ type: 'strong', children: [{ type: 'text', value: expectedContent }] });
    });

    it('should handle malformed italic with snake_case content', () => {
      const md = 'Text with * some_snake_case* here';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');
      expect(emphasis).toStrictEqual({ type: 'emphasis', children: [{ type: 'text', value: 'some_snake_case' }] });
    });

    it('should handle underscore bold with double underscores in content', () => {
      const md = '__hello__world __';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'strong', children: [{ type: 'text', value: 'hello__world' }] }],
      });
    });

    it.each([
      ['_/clients/clear_whitelist _', '/clients/clear_whitelist'],
      ['_some_text _', 'some_text'],
      ['_a_b_c _', 'a_b_c'],
    ])('should handle underscore italic with underscores in content (%s)', (md, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [{ type: 'emphasis', children: [{ type: 'text', value: expectedContent }] }],
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
          { type: 'strong', children: [{ type: 'text', value: 'some_snake_case' }] },
          { type: 'text', value: ' and click' },
        ],
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
          { type: 'strong', children: [{ type: 'text', value: 'Bold' }] },
        ],
      });
    });
  });

  describe('intraword emphasis', () => {
    describe.each([
      { marker: '_', name: 'underscore', nodeType: 'emphasis' as const },
      { marker: '*', name: 'asterisk', nodeType: 'emphasis' as const },
    ])('intraword italic with $name', ({ marker, nodeType }) => {
      it('should italicize intraword pattern', () => {
        const md = `The fail${marker}back${marker} process completed.`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: nodeType, children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword pattern in parentheses', () => {
        const md = `The process (fail${marker}over${marker}) completed.`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: nodeType, children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });
    });

    describe.each([
      { marker: '__', name: 'underscore', nodeType: 'strong' as const },
      { marker: '**', name: 'asterisk', nodeType: 'strong' as const },
    ])('intraword bold with $name', ({ marker, nodeType }) => {
      it('should bold intraword pattern', () => {
        const md = `The fail${marker}back${marker} process completed.`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: nodeType, children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword pattern in parentheses', () => {
        const md = `The process (fail${marker}over${marker}) completed.`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: nodeType, children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });
    });

    it('should handle multiple intraword patterns (underscore italic)', () => {
      const md = 'Both fail_over_ and fail_back_ are supported.';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasisNodes = paragraph.children.filter((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasisNodes).toHaveLength(2);
      expect(emphasisNodes[0]?.children[0]).toStrictEqual({ type: 'text', value: 'over' });
      expect(emphasisNodes[1]?.children[0]).toStrictEqual({ type: 'text', value: 'back' });
    });

    it('should handle multiple intraword patterns (underscore bold)', () => {
      const md = 'Both fail__over__ and fail__back__ are supported.';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');

      expect(strongNodes).toHaveLength(2);
      expect(strongNodes[0]?.children[0]).toStrictEqual({ type: 'text', value: 'over' });
      expect(strongNodes[1]?.children[0]).toStrictEqual({ type: 'text', value: 'back' });
    });

    it('should handle intraword pattern at end of sentence', () => {
      const md = 'Use fail_back_.';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.children).toStrictEqual([
        { type: 'text', value: 'Use fail' },
        { type: 'emphasis', children: [{ type: 'text', value: 'back' }] },
        { type: 'text', value: '.' },
      ]);
    });

    it.each([
      ['The some_thing_else variable.', '_', 'underscore italic'],
      ['The some__thing__else variable.', '__', 'underscore bold'],
    ])('should NOT match %s when followed by word character', md => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(emphasis).toBeUndefined();
      expect(strong).toBeUndefined();
    });

    it.each([
      ['The some*thing*else variable.', '*', 'asterisk italic', 'thing'],
      ['The some**thing**else variable.', '**', 'asterisk bold', 'thing'],
    ])('should match %s followed by word character', (md, _marker, _name, expectedContent) => {
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const node = paragraph.children.find(c => c.type === 'emphasis' || c.type === 'strong');
      expect(node).toBeDefined();
      expect((node as Emphasis | Strong)?.children[0]).toStrictEqual({ type: 'text', value: expectedContent });
    });
  });

  describe('multi-node emphasis (spanning inline elements)', () => {
    describe.each(boldMarkers)('multi-node bold with $name ($marker)', ({ marker }) => {
      it('should handle malformed bold containing a link', () => {
        const md = `${marker}A user issues the [shutdown command](https://example.com) ${marker} in the shell`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeDefined();
        expect(strong?.children.length).toBeGreaterThanOrEqual(2);
        expect(strong?.children[0]).toStrictEqual({ type: 'text', value: 'A user issues the ' });
        expect((strong?.children[1] as { type: string }).type).toBe('link');
      });

      it('should handle malformed bold containing inline code', () => {
        const md = `${marker}Use the \`shutdown\` command ${marker} to power off`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeDefined();
        const inlineCode = strong?.children.find(c => (c as { type: string }).type === 'inlineCode');
        expect(inlineCode).toBeDefined();
      });

      it('should preserve text after closing marker', () => {
        const md = `${marker}Bold with [link](url) ${marker} followed by text`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const lastChild = paragraph.children[paragraph.children.length - 1] as Text;
        expect(lastChild.type).toBe('text');
        expect(lastChild.value).toContain('followed by text');
      });

      it('should terminate when opening marker exists but no closing marker found', () => {
        const md = `${marker}orphan opening with [link](url) but no closing`;
        const tree = processor.parse(md);

        expect(() => processor.runSync(tree)).not.toThrow();
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const firstChild = paragraph.children[0] as Text;
        expect(firstChild.type).toBe('text');
        expect(firstChild.value).toContain(marker);
      });

      it('should detect closing marker at start of text node (no space)', () => {
        const md = `${marker}open with [link](url)${marker}no-space-closing`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeDefined();
        expect(strong?.children[0]).toStrictEqual({ type: 'text', value: 'open with ' });
        expect((strong?.children[1] as { type: string }).type).toBe('link');

        const textAfter = paragraph.children.find(
          (c): c is Text => c.type === 'text' && c.value.includes('no-space-closing'),
        );
        expect(textAfter).toBeDefined();
      });

      it('should detect closing marker when text node is just the marker', () => {
        const md = `${marker}bold with [link](url)${marker}`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeDefined();
        expect(strong?.children.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe.each(italicMarkers)('multi-node italic with $name ($marker)', ({ marker }) => {
      it('should handle malformed italic containing a link', () => {
        const md = `${marker}Click the [button](https://example.com) ${marker} to continue`;
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

        expect(emphasis).toBeDefined();
        expect(emphasis?.children.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should terminate when multiple opening markers exist but none have closing', () => {
      const md = '**first orphan and **second orphan with [link](url) no closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
    });

    it('should process first valid pattern and continue checking for more', () => {
      const md = '**first [link1](url1) ** then **second [link2](url2) **';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');
      expect(strongNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('should process valid patterns and skip orphan markers without infinite loop', () => {
      const md = '**valid [link](url) ** and then orphan ** without closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strongNodes = paragraph.children.filter((c): c is Strong => c.type === 'strong');
      expect(strongNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT detect opening marker when text starts with space before marker', () => {
      const md = ' **not an opening because of leading space [link](url) **';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
    });

    it('should NOT match when only closing marker exists without opening', () => {
      const md = 'Just text with [link](url) ** orphan closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
    });

    it('should process multi-node patterns inside blockquotes', () => {
      const md = '> **bold [link](url) ** inside blockquote';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const blockquote = tree.children[0] as Blockquote;
      const paragraph = blockquote.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toBeDefined();
    });

    it('should handle patterns with many inline elements between markers', () => {
      const md = '**start [link1](url1) middle [link2](url2) more [link3](url3) end **';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');
      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThanOrEqual(5);
    });
  });
});
