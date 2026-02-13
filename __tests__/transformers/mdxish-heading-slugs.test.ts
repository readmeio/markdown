import type { Element, Root } from 'hast';

import { visit } from 'unist-util-visit';

import { mdxish } from '../../lib';

function findAllHeadings(tree: Root): { id: string; tagName: string }[] {
  const headings: { id: string; tagName: string }[] = [];
  visit(tree, 'element', (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName) && node.properties?.id) {
      headings.push({ id: String(node.properties.id), tagName: node.tagName });
    }
  });
  return headings;
}

describe('heading slugs', () => {
  describe('plain headings', () => {
    it('should generate slugs from plain headings', () => {
      const md = '## Hello';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello');
    });

    it('should handle headings with special characters and symbols', () => {
      const md = '## Hello World! @#$%^&*()';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-world-');
    });

    it('should handle headings with multiple spaces and punctuation', () => {
      const md = '## Hello    World...   Test!!!';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello----world---test');
    });

    it('should handle headings with unicode and emoji characters', () => {
      const md = '## Hello 🌍 World 你好';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello--world-你好');
    });

    it('should handle headings with numbers and mixed case', () => {
      const md = '## Version 2.0 Release Notes';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('version-20-release-notes');
    });

    it('should handle headings with slashes and backslashes', () => {
      const md = '## API /v1/users endpoint';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('api-v1users-endpoint');
    });
  });

  describe('user variables', () => {
    it('should generate slugs from variable names, not resolved values', () => {
      const md = '## Hello {user.name}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-username');
    });

    it('should handle multiple headings with variables', () => {
      const md = '## Hello {user.name}\n\n## Goodbye {user.email}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-username');
      expect(headings[1].id).toBe('goodbye-useremail');
    });

    it('should deduplicate heading slugs', () => {
      const md = '## Hello {user.name}\n\n## Hello {user.name}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-username');
      expect(headings[1].id).toBe('hello-username-1');
    });

    it('should handle variable names with numbers and underscores', () => {
      const md = '## User {user.user_name_123}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('user-useruser_name_123');
    });

    it('should handle variable names with hyphens and special characters', () => {
      const md = '## Welcome {user.user-name}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('welcome-useruser-name');
    });

    it('should handle multiple variables in a single heading', () => {
      const md = '## Hello {user.firstName} {user.lastName}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-userfirstname-userlastname');
    });

    it('should handle variable at the start of heading', () => {
      const md = '## {user.name} Profile';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('username-profile');
    });

    it('should handle variable with mixed case and camelCase', () => {
      const md = '## User {user.firstName}';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('user-userfirstname');
    });
  });

  describe('legacy variables', () => {
    it('should use the variable name for the slug', () => {
      const content = '## Hello <<name>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-name');
    });

    it('should handle multiple headings with legacy variables', () => {
      const content = '## Hello <<name>>\n\n### Goodbye <<email>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-name');
      expect(headings[1].id).toBe('goodbye-email');
    });

    it('should deduplicate slugs from legacy variable headings', () => {
      const content = '## Hello <<name>>\n\n## Hello <<name>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(2);
      expect(headings[0].id).toBe('hello-name');
      expect(headings[1].id).toBe('hello-name-1');
    });

    it('should handle legacy variable names with numbers and underscores', () => {
      const content = '## User <<user_name_123>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('user-user_name_123');
    });

    it('should handle legacy variable names with hyphens', () => {
      const content = '## Welcome <<user-name>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('welcome-user-name');
    });

    it('should handle multiple legacy variables in a single heading', () => {
      const content = '## Hello <<firstName>> <<lastName>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-firstname-lastname');
    });

    it('should handle legacy variable at the start of heading', () => {
      const content = '## <<name>> Profile';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('name-profile');
    });

    it('should handle legacy variable with mixed case and camelCase', () => {
      const content = '## User <<firstName>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('user-firstname');
    });
  });
});