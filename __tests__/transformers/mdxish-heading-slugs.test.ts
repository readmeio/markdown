import type { Element, Root } from 'hast';
import type { Heading } from 'mdast';

import { visit } from 'unist-util-visit';

import { mdxish } from '../../lib';
import { mdastV6Wrapper } from '../helpers';

function findAllHeadings(tree: Root): { id: string }[] {
  const headings: { id: string; }[] = [];
  visit(tree, 'element', (node: Element) => {
    if (/^h[1-6]$/.test(node.tagName) && node.properties?.id) {
      headings.push({ id: String(node.properties.id) });
    }
  });
  return headings;
}

function findAllHeadingsInMdast(tree: Root): { id: string; }[] {
  const headings: { id: string; }[] = [];
  visit(tree, 'heading', (node: Heading) => {
    if (node.data?.hProperties?.id) {
      headings.push({ id: String(node.data.hProperties.id) });
    }
  });
  return headings;
}

describe('heading slugs', () => {
  // Ensure mdxish slugs match legacy slugs for headings without variables
  describe('plain headings', () => {
    it('with normal text should match legacy', () => {
      const md = '## Hello';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with special characters and symbols should match legacy', () => {
      const md = '## Hello World! @#$%^&*()';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello-world-');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with multiple spaces and punctuation should match legacy', () => {
      const md = '##  Hello    World...   Test!!!   ';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello----world---test');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with unicode and emoji characters should match legacy', () => {
      const md = '## Hello 🌍 World 你好';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hello--world-你好');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with numbers and mixed case should match legacy', () => {
      const md = '## Version 2.0 Release Notes';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('version-20-release-notes');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with slashes and backslashes should match legacy', () => {
      const md = '## API /v1/users endpoint';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('api-v1users-endpoint');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('that has multiple headings of the same content should be incremented and match legacy', () => {
      const md = '## Hello\n\n## Hello \n\n### Hello';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(3);
      expect(headings[0].id).toBe('hello');
      expect(headings[1].id).toBe('hello-1');
      expect(headings[2].id).toBe('hello-2');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
      expect(legacyHeadings[1].id).toBe(headings[1].id);
      expect(legacyHeadings[2].id).toBe(headings[2].id);
    });

    it('with escaped characters should match legacy', () => {
      const md = '## Hello\\tWorld';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('hellotworld');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with markdown formatting inside headings should match legacy', () => {
      const md = '## **Bold** and _italic_ text';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('bold-and-italic-text');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with accented latin characters should match legacy', () => {
      const md = '## Café Résumé';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('café-résumé');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });

    it('with non-latin scripts should match legacy', () => {
      const md = '## Привет мир';
      const tree = mdxish(md);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('привет-мир');

      const legacyTree = mdastV6Wrapper(md) as Root;
      const legacyHeadings = findAllHeadingsInMdast(legacyTree);
      expect(legacyHeadings[0].id).toBe(headings[0].id);
    });
  });

  describe('MDX variables', () => {
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

    it('should handle multiple same headings with legacy variables should be incremented and match legacy', () => {
      const content = '## Hello <<name>>\n\n## Hello <<name>>\n\n### Hello <<name>>';
      const tree = mdxish(content);
      const headings = findAllHeadings(tree);
      expect(headings).toHaveLength(3);
      expect(headings[0].id).toBe('hello-name');
      expect(headings[1].id).toBe('hello-name-1');
      expect(headings[2].id).toBe('hello-name-2');
    });
  });
});