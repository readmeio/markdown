import type { Element, Root, RootContent, Text } from 'hast';

import { mdxish } from '../../../lib';

type HastNode = Root | RootContent;

function findElementByTagName(node: HastNode, tagName: string): Element | null {
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    return node;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.reduce<Element | null>((found, child) => {
      if (found) return found;
      return findElementByTagName(child, tagName);
    }, null);
  }

  return null;
}

function getCodeText(tree: Root): string {
  const code = findElementByTagName(tree, 'code');
  if (!code || code.children.length === 0) return '';

  return (code.children[0] as Text).value || '';
}

describe('mdxish variables-code transformer', () => {
  it('resolves legacy <<var>> in inline code', () => {
    const tree = mdxish('Use `Bearer <<apiKey>>` token', {
      variables: {
        user: { apiKey: 'abc123' },
        defaults: [],
      },
    });

    expect(getCodeText(tree)).toBe('Bearer abc123');
  });

  it('resolves legacy <<var>> in code blocks', () => {
    const tree = mdxish(
      `\`\`\`js
const name = 'Bearer <<apiKey>>';
\`\`\``,
      {
        variables: { user: { apiKey: 'abc123' }, defaults: [] },
      },
    );

    expect(getCodeText(tree)).toContain('Bearer abc123');
  });

  it('resolves {user.var} in code blocks', () => {
    const tree = mdxish(
      `\`\`\`js
const name = '{user.name}';
\`\`\``,
      {
        variables: {
          user: { name: 'Owlbert' },
          defaults: [],
        },
      },
    );

    expect(getCodeText(tree)).toContain("const name = 'Owlbert';");
  });

  it('falls back to defaults in code nodes', () => {
    const tree = mdxish(
      `\`\`\`txt
<<region>> {user.region}
\`\`\``,
      {
        variables: {
          user: {},
          defaults: [{ name: 'region', default: 'us-east-1' }],
        },
      },
    );

    expect(getCodeText(tree)).toContain('us-east-1 us-east-1');
  });

  it('does not replace glossary and missing variables', () => {
    const tree = mdxish('`<<glossary:term>> <<missing>> {user.missing}`', {
      variables: {
        user: {},
        defaults: [],
      },
    });

    expect(getCodeText(tree)).toBe('<<glossary:term>> <<missing>> {user.missing}');
  });
});
