import type { Root, Text } from 'hast';

import { mdxish } from '../../../lib';
import { findElementByTagName } from '../../helpers';

function getCodeText(tree: Root): string {
  const code = findElementByTagName(tree, 'code');
  if (!code || code.children.length === 0) return '';

  return (code.children[0] as Text).value || '';
}

describe('mdxish variables-code transformer', () => {
  it.each([
    {
      name: 'legacy variable',
      variable: '<<apiKey>>',
    },
    {
      name: 'MDX variable',
      variable: '{user.apiKey}',
    },
  ])('resolves $name in inline code', ({ variable }) => {
    const md = `Use \`Bearer ${variable}\` token`;
    const variables = { user: { apiKey: 'abc123' }, defaults: [] };
    const tree = mdxish(md, { variables });
    expect(getCodeText(tree)).toBe('Bearer abc123');
  });

  it.each([
    {
      name: 'legacy variable',
      variable: '<<apiKey>>',
    },
    {
      name: 'MDX variable',
      variable: '{user.apiKey}',
    },
  ])('resolves $name in code blocks', ({ variable }) => {
    const md = `\`\`\`js
const name = 'Bearer ${variable}';
\`\`\``;
    const variables = { user: { apiKey: 'abc123' }, defaults: [] };
    const tree = mdxish(md, { variables });
    expect(getCodeText(tree)).toContain("const name = 'Bearer abc123';");
  });

  it.each([
    {
      name: 'legacy variable',
      variable: '<<apiKey>>',
    },
    {
      name: 'MDX variable',
      variable: '{user.apiKey}',
    },
  ])('resolves $name in code magic blocks', ({ variable }) => {
    const md = `[block:code]
{
  "codes": [
    {
      "code": "const name = 'Bearer ${variable}';",
      "language": "js"
    }
  ]
}
[/block]`;
    const variables = { user: { apiKey: 'abc123' }, defaults: [] };
    const tree = mdxish(md, { variables });
    expect(getCodeText(tree)).toContain("const name = 'Bearer abc123';");
  });

  it('resolves both legacy and MDX variables in code blocks', () => {
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

  it('capitalises legacy glossary and missing variables', () => {
    const tree = mdxish('`<<glossary:term>> <<missing>> {user.missing}`', {
      variables: {
        user: {},
        defaults: [],
      },
    });

    expect(getCodeText(tree)).toBe('GLOSSARY:TERM MISSING USER.MISSING');
  });

  it('resolves legacy variables with whitespace in the name', () => {
    const tree = mdxish('`<<api key>>`', {
      variables: {
        user: {},
        defaults: [{ name: 'api key', default: 'sk_live_123' }],
      },
    });

    expect(getCodeText(tree)).toBe('sk_live_123');
  });

  it('does not double-resolve when a legacy variable value contains an MDX variable pattern', () => {
    const tree = mdxish('`<<payload>>`', {
      variables: {
        user: { payload: '{user.secret}', secret: 'should-not-appear' },
        defaults: [],
      },
    });

    expect(getCodeText(tree)).toBe('{user.secret}');
  });
});
