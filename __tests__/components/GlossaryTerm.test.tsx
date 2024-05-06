import { render, screen } from '@testing-library/react';
import React from 'react';

import { run, compile } from '../../index';

describe('GlossaryItem', () => {
  it('renders a glossary item', async () => {
    const md = `<GlossaryItem term="parliament" />`;
    const Content = await run(compile(md));
    render(<Content />);

    expect(screen.getByText('parliament')).toBeVisible();
  });
});
