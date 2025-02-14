import { render, screen } from '@testing-library/react';
import React from 'react';

import * as rmdx from '../../index';
import { execute } from '../helpers';

describe('variables transformer', () => {
  it('renders user variables', async () => {
    const mdx = '{user.name}';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = (await execute(mdx, { variables })) as () => React.ReactNode;

    render(<Content />);

    expect(screen.findByText('Test User')).toBeDefined();
  });

  it('renders user variables in a phrasing context', async () => {
    const mdx = 'Hello, {user.name}!';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = (await execute(mdx, { variables })) as () => React.ReactNode;

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
});
