import type { Code, Paragraph } from 'mdast';

import { removePosition } from 'unist-util-remove-position';

import { mdast } from '../../index';

describe('variables transformer', () => {
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

  it('does not transform variables inside code blocks', () => {
    const md = '```\n{user.X-API-Key}\n```';
    const tree = mdast(md);
    removePosition(tree, { force: true });

    const code = tree.children[0] as Code;
    expect(code.type).toBe('code');
    expect(code.value).toBe('{user.X-API-Key}');
  });
});
