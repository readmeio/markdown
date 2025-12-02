import { render, screen } from '@testing-library/react';
import React from 'react';

import * as rmdx from '../../index';
import { execute } from '../helpers';

describe('variables transformer', () => {
  it('renders user variables', () => {
    const mdx = '{user.name}';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = execute(mdx, { variables }) as () => React.ReactNode;

    render(<Content />);

    expect(screen.findByText('Test User')).toBeDefined();
  });

  it('renders user variables in a phrasing context', () => {
    const mdx = 'Hello, {user.name}!';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = execute(mdx, { variables }) as () => React.ReactNode;

    render(<Content />);

    expect(screen.findByText('Test User')).toBeDefined();
  });

  it('parses variables into the mdast', () => {
    const mdx = '{user.name}';

    // @ts-expect-error - custom matcher types aren't set up right
    expect(rmdx.mdast(mdx)).toStrictEqualExceptPosition({
      children: [
        {
          value: '{user.name}',
          data: {
            hName: 'Variable',
            hProperties: {
              name: 'name',
            },
          },
          type: 'readme-variable',
        },
      ],
      type: 'root',
    });
  });

  it('does not parse regular expressions into variables', () => {
    const mdx = '{notUser.name}';

    expect(rmdx.mdast(mdx).children[0].type).toBe('mdxFlowExpression');
  });

  it('does not parse variables inside inline code blocks', () => {
    const mdx = '`{user.name}`';

    const tree = rmdx.mdast(mdx);
    const inlineCodeNode = tree.children[0];

    // Should be a paragraph containing inline code
    expect(inlineCodeNode.type).toBe('paragraph');
    expect(inlineCodeNode).toHaveProperty('children');

    const paragraphNode = inlineCodeNode as { children: { type: string; value?: string }[]; type: string };
    const codeNode = paragraphNode.children[0];

    expect(codeNode.type).toBe('inlineCode');
    expect(codeNode.value).toBe('{user.name}');
  });

  it('renders variables inside inline code as literal text', () => {
    const mdx = 'Use `{user.name}` in your code';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = execute(mdx, { variables }) as () => React.ReactNode;

    render(<Content />);

    // @ts-expect-error - jest-dom matchers not typed correctly
    expect(screen.getByText(/Use.*in your code/)).toBeInTheDocument();
    const codeElement = screen.getByText('{user.name}');
    expect(codeElement.tagName).toBe('CODE');
  });
});
