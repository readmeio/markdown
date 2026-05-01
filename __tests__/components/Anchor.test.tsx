import { render, screen } from '@testing-library/react';
import React from 'react';

import { renderingEngines } from './utils';

describe('Anchor', () => {
  it.each(renderingEngines)('%s: renders a basic anchor', (_label, renderContent) => {
    const md = '<Anchor href="https://example.com">Click me</Anchor>';
    const Content = renderContent(md);

    render(<Content />);

    expect(screen.getByRole('link')).toMatchSnapshot();
  });

  it.each(renderingEngines)('%s: unwraps nested anchor elements', (_label, renderContent) => {
    // GFM autolinks URL-like text inside an Anchor; output must be a single <a>
    const md = '<Anchor href="https://example.com" target="_blank">https://example.com</Anchor>';
    const Content = renderContent(md);

    const { container } = render(<Content />);

    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toMatchSnapshot();
  });

  it.each(renderingEngines)('%s: preserves non-anchor children', (_label, renderContent) => {
    const md =
      '<Anchor href="https://example.com"><strong>Bold</strong> and <em>italic</em></Anchor>';
    const Content = renderContent(md);

    render(<Content />);

    expect(screen.getByRole('link')).toMatchSnapshot();
  });
});
