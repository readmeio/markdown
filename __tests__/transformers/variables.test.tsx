import React from 'react';
import * as rmdx from '../../index';
import { execute } from '../helpers';
import { render, screen } from '@testing-library/react';

describe('variables transformer', () => {
  it('renders user variables', async () => {
    const mdx = '{user.name}';
    const variables = {
      user: {
        name: 'Test User',
      },
    };
    const Content = await execute(mdx, { variables });

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
    const Content = await execute(mdx, { variables });

    render(<Content />);

    expect(screen.findByText('Test User')).toBeDefined();
  });

  it.only('parses variables into the mdast', () => {
    const mdx = `{user.name}`;

    // @ts-ignore
    expect(rmdx.mdast(mdx)).toStrictEqualExceptPosition({
      children: [
        {
          value: '{user.name}',
          name: 'name',
          type: 'readme-variable',
        },
      ],
      type: 'root',
    });
  });
});
