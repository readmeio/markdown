import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('Callouts', () => {
  it('renders a > callout with no title with no empty blank heading', () => {
    const md = `
> 🚧
>
> Callout content`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
  });

  it('renders a magic block callout with no title with no empty blank heading', () => {
    const md = '[block:callout]{"type":"info","body":"This is important"}[/block]';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
  });
});