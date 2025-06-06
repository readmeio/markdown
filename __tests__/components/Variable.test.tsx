import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('Variable', () => {
  it('render a variable', () => {
    const md = '<Variable variable="name" />';
    const Content = execute(md);

    render(<Content />);

    expect(screen.getByText('NAME')).toBeVisible();
  });
});
