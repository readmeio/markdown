import { render, screen } from '@testing-library/react';
import React from 'react';

import { renderingEngines } from './utils';

describe('Glossary', () => {
  it.each(renderingEngines)('%s: renders a glossary item', (_label, renderContent) => {
    const md = '<Glossary>parliament</Glossary>';
    const Content = renderContent(md);
    render(<Content />);

    expect(screen.getByText('parliament')).toBeVisible();
  });
});
