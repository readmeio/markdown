import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('run', () => {
  it('allows providing imports', async () => {
    const mdx = 'Hello, world!';
    const Component = await execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('merges the imports with the built-ins', async () => {
    const mdx = '{user.test}';
    const Component = await execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('throws an error when a component does not exist', async () => {
    const mdx = '<NonExistentComponent />';
    const Component = await execute(mdx, {}, {});

    expect(() => {
      render(<Component />);
    }).toThrow(
      'Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it.',
    );
  });

  it.only('renders null for a non-existant component when `allowMissingComponents === true`', async () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;
    const Component = await execute(mdx, {}, { allowMissingComponents: true });

    expect(() => {
      render(<Component />);
    }).not.toThrow();
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });
});
