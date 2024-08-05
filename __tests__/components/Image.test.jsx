import { render, screen } from '@testing-library/react';
import React from 'react';

import createImage from '../../components/Image';

describe('Callout', () => {
  it('render image with alt text', () => {
    const altText = 'test alt text';
    const Image = createImage({ lazyImages: true });
    render(<Image alt={altText} src="https://example.com" />);

    expect(screen.getByAltText(altText)).toBeInTheDocument();
  });

  it('render non-lazy image with alt text', () => {
    const altText = 'test alt text';
    const Image = createImage({ lazyImages: false });
    render(<Image alt={altText} src="https://example.com" />);

    expect(screen.getByAltText(altText)).toBeInTheDocument();
  });

  it('render emoji with alt text', () => {
    const altText = 'test alt text';
    const Image = createImage({ lazyImages: true });
    render(<Image alt={altText} className="emoji" src="https://example.com" />);

    expect(screen.getByAltText(altText)).toBeInTheDocument();
  });
});
