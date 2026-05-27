import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('variables', () => {
  it('renders a variable', () => {
    const md = '{user.name}';
    const Content = execute(md, {}, { variables: { user: { name: 'Testing' } } });

    render(<Content />);

    expect(screen.getByText('Testing')).toBeVisible();
  });

  it('renders a default value', () => {
    const md = '{user.name}';
    const Content = execute(md);

    render(<Content />);

    expect(screen.getByText('NAME')).toBeVisible();
  });

  it('supports user variables in ESM', () => {
    const md = `
export const Hello = () => <p>{user.name}</p>;

<Hello />
`;
    const Content = execute(md, {}, { variables: { user: { name: 'Owlbert' } } });

    render(<Content />);

    expect(screen.getByText('Owlbert')).toBeVisible();
  });

  it.each([
    {
      expected: 'rdme_123',
      md: '{user.keys[0].apiKey}',
      name: 'arrays',
      user: { keys: [{ apiKey: 'rdme_123' }] },
    },
    {
      expected: 'enterprise',
      md: '{user.profile.plan}',
      name: 'objects',
      user: { profile: { plan: 'enterprise' } },
    },
    {
      expected: 'active 25',
      md: "{user.active ? 'active' : 'inactive'} {user.limit}",
      name: 'primitives',
      user: { active: true, limit: 25 },
    },
  ])('supports structured user variables: $name', ({ expected, md, user }) => {
    const Content = execute(md, {}, { variables: { user } });

    render(<Content />);

    expect(screen.getByText(expected)).toBeVisible();
  });
});
