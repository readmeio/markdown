import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('Glossary', () => {
  it('renders a glossary item', async () => {
    const md = '<Glossary>parliament</Glossary>';
    const Content = await execute(md);
    render(<Content />);

    expect(screen.getByText('parliament')).toBeVisible();
  });
});
