import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('run', () => {
  it('allows providing imports', () => {
    const mdx = 'Hello, world!';
    const Component = execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('merges the imports with the built-ins', () => {
    const mdx = '{user.test}';
    const Component = execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('renders null for a non-existant component', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;
    const Component = execute(mdx, {}, {});

    render(<Component />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders null for a non-existant component when `missingComponents === "ignore"`', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;
    const Component = execute(mdx, { missingComponents: 'ignore' }, {});

    render(<Component />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('throws an error when a component does not exist and `missingComponents === "throw"`', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;

    let error;
    try {
      execute(mdx, { missingComponents: 'throw' }, {});
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe(
      'Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it.',
    );
  });
});
