import React from 'react';
import { render, screen } from '@testing-library/react';

import { execute } from '../helpers';

describe('run', () => {
  it('allows providing imports', async () => {
    const mdx = `Hello, world!`;
    const Component = await execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('merges the imports with the built-ins', async () => {
    const mdx = `{user.test}`;
    const Component = await execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });
});
