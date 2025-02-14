import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('variables', () => {
  it('renders a variable', async () => {
    const md = '{user.name}';
    const Content = await execute(md, {}, { variables: { user: { name: 'Testing' } } });

    render(<Content />);

    expect(screen.getByText('Testing')).toBeVisible();
  });

  it('renders a default value', async () => {
    const md = '{user.name}';
    const Content = await execute(md);

    render(<Content />);

    expect(screen.getByText('NAME')).toBeVisible();
  });

  it('supports user variables in ESM', async () => {
    const md = `
export const Hello = () => <p>{user.name}</p>;

<Hello />
`;
    const Content = await execute(md, {}, { variables: { user: { name: 'Owlbert' } } });

    render(<Content />);

    expect(screen.getByText('Owlbert')).toBeVisible();
  });
});
