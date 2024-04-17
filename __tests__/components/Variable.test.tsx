import { render, screen } from '@testing-library/react';
import React from 'react';

import { run, compile } from '../../index';

describe('Variable', () => {
  it('render a variable', async () => {
    const md = `<Variable variable="name" />`;
    const Content = await run(compile(md));
    render(<Content />);

    expect(screen.getByText('NAME')).toBeVisible();
  });
});
