import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('Glossary', () => {
  it('renders a glossary item', () => {
    const md = '<Glossary>parliament</Glossary>';
    const Content = execute(md);
    render(<Content />);

    expect(screen.getByText('parliament')).toBeVisible();
  });
});
