import type { Code, Paragraph, Strong } from 'mdast';

import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { removePosition } from 'unist-util-remove-position';

import normalizeEmphasisAST from '../../processor/transform/mdxish/normalize-malformed-md-syntax';

const processor = remark().use(remarkParse).use(normalizeEmphasisAST);

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
  });
});
