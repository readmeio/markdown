import type { Code, Paragraph } from 'mdast';

import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';

describe('variables transformer', () => {
  describe('hyphenated variables', () => {
    it('transforms hyphenated variables like user.X-API-Key', () => {
      const md = 'Your API key is {user.X-API-Key}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toMatchObject({
        type: 'readme-variable',
        value: '{user.X-API-Key}',
        data: {
          hName: 'Variable',
          hProperties: { name: 'X-API-Key' },
        },
      });
    });

    it('transforms hyphenated variables with numbers', () => {
      const md = 'Value: {user.api-v2-key}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toMatchObject({
        type: 'readme-variable',
        value: '{user.api-v2-key}',
        data: {
          hName: 'Variable',
          hProperties: { name: 'api-v2-key' },
        },
      });
    });

    it('does not transform variables inside code blocks', () => {
      const md = '```\n{user.X-API-Key}\n```';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const code = tree.children[0] as Code;
      expect(code.type).toBe('code');
      expect(code.value).toBe('{user.X-API-Key}');
    });
  });

  describe('subtraction expressions (right side is NOT Identifier)', () => {
    it('does not transform user variable minus number', () => {
      const md = 'Result: {user.num - 1}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform expression ending with number after hyphen', () => {
      const md = 'Result: {user.X-1}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform number minus user variable', () => {
      const md = 'Result: {1 - user.variable}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform subtraction of two user variables', () => {
      const md = 'Result: {user.a - user.b}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform complex expression ending with user variable', () => {
      const md = 'Result: {user.num - 1 - user.another}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });
  });

  describe('subtraction expressions (right side IS Identifier but has spaces)', () => {
    it('does not transform subtraction with spaces', () => {
      const md = 'Result: {user.num - total}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform hyphenated variable followed by spaced subtraction', () => {
      const md = 'Result: {user.a-b - c}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });

    it('does not transform multiple spaced subtractions', () => {
      const md = 'Result: {user.a - b - c}';
      const tree = mdast(md);
      removePosition(tree, { force: true });

      const paragraph = tree.children[0] as Paragraph;
      const variable = paragraph.children.find(child => child.type === 'readme-variable');

      expect(variable).toBeUndefined();
    });
  });
});
