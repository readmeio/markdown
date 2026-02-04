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

    it('should NOT add space before punctuation when no trailing space before closing markers', () => {
      const md = 'This is ** bold**!';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      // No space before ! because there was no space before closing **
      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This ' },
          { type: 'text', value: 'is ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
          },
          { type: 'text', value: '!' },
        ],
      });
    });

    it('should preserve space before punctuation when trailing space before closing markers', () => {
      const md = 'This is ** bold **!';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      // Space before ! because there was a space before closing **
      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This ' },
          { type: 'text', value: 'is ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
          },
          { type: 'text', value: ' !' },
        ],
      });
    });

    it('should handle escaped asterisk in content', () => {
      const md = 'This is ** bo\\*ld**!';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      // Escaped asterisk should be preserved in content
      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This ' },
          { type: 'text', value: 'is ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bo*ld' }],
          },
          { type: 'text', value: '!' },
        ],
      });
    });

    it('should preserve space before word when trailing space before closing markers', () => {
      const md = 'This is ** bold **Hello';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      // Space before H because there was a space before closing **
      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This ' },
          { type: 'text', value: 'is ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
          },
          { type: 'text', value: ' H' },
          { type: 'text', value: 'ello' },
        ],
      });
    });

    it('should NOT add space before word when no trailing space before closing markers', () => {
      const md = 'This is ** bold**Hello';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      // No space before H because there was no space before closing **
      expect(tree.children[0]).toStrictEqual({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This ' },
          { type: 'text', value: 'is ' },
          {
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
          },
          { type: 'text', value: 'H' },
          { type: 'text', value: 'ello' },
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

  describe('intraword italic', () => {
    describe('underscore syntax', () => {
      it('should italicize intraword _word_ pattern', () => {
        const md = 'The fail_back_ process completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: 'emphasis', children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword _word_ in parentheses', () => {
        const md = 'The process (fail_over_) completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: 'emphasis', children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });

      it('should handle multiple intraword _word_ patterns', () => {
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

      it('should handle intraword _word_ at end of sentence', () => {
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

      it('should NOT match when followed by word character', () => {
        const md = 'The some_thing_else variable.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

        expect(emphasis).toBeUndefined();
      });
    });

    describe('asterisk syntax', () => {
      it('should italicize intraword *word* pattern', () => {
        const md = 'The fail*back* process completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: 'emphasis', children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword *word* in parentheses', () => {
        const md = 'The process (fail*over*) completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: 'emphasis', children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });

      it('should handle intraword *word* followed by word character', () => {
        const md = 'The some*thing*else variable.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

        expect(emphasis).toBeDefined();
        expect(emphasis?.children[0]).toStrictEqual({ type: 'text', value: 'thing' });
      });
    });
  });

  describe('intraword bold', () => {
    describe('underscore syntax', () => {
      it('should bold intraword __word__ pattern', () => {
        const md = 'The fail__back__ process completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: 'strong', children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword __word__ in parentheses', () => {
        const md = 'The process (fail__over__) completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: 'strong', children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });

      it('should handle multiple intraword __word__ patterns', () => {
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

      it('should NOT match when followed by word character', () => {
        const md = 'The some__thing__else variable.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeUndefined();
      });
    });

    describe('asterisk syntax', () => {
      it('should bold intraword **word** pattern', () => {
        const md = 'The fail**back** process completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The fail' },
          { type: 'strong', children: [{ type: 'text', value: 'back' }] },
          { type: 'text', value: ' process completed.' },
        ]);
      });

      it('should handle intraword **word** in parentheses', () => {
        const md = 'The process (fail**over**) completed.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        expect(paragraph.children).toStrictEqual([
          { type: 'text', value: 'The process (fail' },
          { type: 'strong', children: [{ type: 'text', value: 'over' }] },
          { type: 'text', value: ') completed.' },
        ]);
      });

      it('should handle intraword **word** followed by word character', () => {
        const md = 'The some**thing**else variable.';
        const tree = processor.parse(md);
        processor.runSync(tree);
        removePosition(tree, { force: true });

        const paragraph = tree.children[0] as Paragraph;
        const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

        expect(strong).toBeDefined();
        expect(strong?.children[0]).toStrictEqual({ type: 'text', value: 'thing' });
      });
    });
  });

  describe('multi-node emphasis (spanning inline elements like links)', () => {
    it('should handle malformed bold containing a link', () => {
      const md = '**A user issues the [shutdown command](https://example.com) ** in the shell';
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

    it('should handle malformed bold (underscore) containing a link', () => {
      const md = '__A user issues the [shutdown command](https://example.com) __ in the shell';
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

    it('should handle malformed italic containing a link', () => {
      const md = '*Click the [button](https://example.com) * to continue';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toBeDefined();
      expect(emphasis?.children.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle malformed italic (underscore) containing a link', () => {
      const md = '_Click the [button](https://example.com) _ to continue';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const emphasis = paragraph.children.find((c): c is Emphasis => c.type === 'emphasis');

      expect(emphasis).toBeDefined();
      expect(emphasis?.children.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle malformed bold containing inline code', () => {
      const md = '**Use the `shutdown` command ** to power off';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      const inlineCode = strong?.children.find(c => (c as { type: string }).type === 'inlineCode');
      expect(inlineCode).toBeDefined();
    });

    it('should handle malformed bold (underscore) containing inline code', () => {
      const md = '__Use the `shutdown` command __ to power off';
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
      const md = '**Bold with [link](url) ** followed by text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const lastChild = paragraph.children[paragraph.children.length - 1] as Text;
      expect(lastChild.type).toBe('text');
      expect(lastChild.value).toContain('followed by text');
    });

    it('should preserve text after closing marker (underscore)', () => {
      const md = '__Bold with [link](url) __ followed by text';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const lastChild = paragraph.children[paragraph.children.length - 1] as Text;
      expect(lastChild.type).toBe('text');
      expect(lastChild.value).toContain('followed by text');
    });
  });

  describe('multi-node emphasis recursion termination', () => {
    it('should terminate when opening marker exists but no closing marker is found', () => {
      const md = '**orphan opening with [link](url) but no closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const firstChild = paragraph.children[0] as Text;
      expect(firstChild.type).toBe('text');
      expect(firstChild.value).toContain('**');
    });

    it('should terminate when opening marker (underscore) exists but no closing marker is found', () => {
      const md = '__orphan opening with [link](url) but no closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const firstChild = paragraph.children[0] as Text;
      expect(firstChild.type).toBe('text');
      expect(firstChild.value).toContain('__');
    });

    it('should terminate when multiple opening markers exist but none have closing markers', () => {
      const md = '**first orphan and **second orphan with [link](url) no closing';
      const tree = processor.parse(md);

      expect(() => processor.runSync(tree)).not.toThrow();
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      expect(paragraph.type).toBe('paragraph');
    });

    it('should detect closing marker at start of text node (no space before **)', () => {
      const md = '**open with [link](url)**no-space-closing';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThanOrEqual(2);
      expect(strong?.children[0]).toStrictEqual({ type: 'text', value: 'open with ' });
      expect((strong?.children[1] as { type: string }).type).toBe('link');

      const textAfter = paragraph.children.find(
        (c): c is Text => c.type === 'text' && c.value.includes('no-space-closing'),
      );
      expect(textAfter).toBeDefined();
    });

    it('should detect closing marker at start of text node (no space before __)', () => {
      const md = '__open with [link](url)__no-space-closing';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThanOrEqual(2);
      expect(strong?.children[0]).toStrictEqual({ type: 'text', value: 'open with ' });
      expect((strong?.children[1] as { type: string }).type).toBe('link');

      const textAfter = paragraph.children.find(
        (c): c is Text => c.type === 'text' && c.value.includes('no-space-closing'),
      );
      expect(textAfter).toBeDefined();
    });

    it('should detect closing marker when text node is just "**"', () => {
      const md = '**bold with [link](url)**';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect closing marker when text node is just "__"', () => {
      const md = '__bold with [link](url)__';
      const tree = processor.parse(md);
      processor.runSync(tree);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const strong = paragraph.children.find((c): c is Strong => c.type === 'strong');

      expect(strong).toBeDefined();
      expect(strong?.children.length).toBeGreaterThanOrEqual(2);
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

    it('should NOT detect opening marker when text starts with space before **', () => {
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
      expect(blockquote.type).toBe('blockquote');
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
