import { render, screen } from '@testing-library/react';
import React from 'react';

import { renderingEngines } from './utils';

describe('Variable', () => {
  it.each(renderingEngines)('%s: render a variable', (_label, renderContent) => {
    const md = '<Variable variable="name" />';
    const Content = renderContent(md);

    render(<Content />);

    expect(screen.getByText('NAME')).toBeVisible();
  });
});
