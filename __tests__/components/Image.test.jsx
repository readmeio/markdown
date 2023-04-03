import { render, screen } from '@testing-library/react';
import React from 'react';

import CreateImage from '../../components/Image';

const Image = CreateImage({ lazyImages: true });

describe('Image', () => {
  it('render _all_ its children', () => {
    render(<Image align="center" src="https://files.readme.io/b8674d6-pizzabro.jpg"></Image>);

    expect(screen.getByRole('img')).toMatchInlineSnapshot(`
      <img
        align="middle"
        alt=""
        caption=""
        height="auto"
        loading="lazy"
        src="https://files.readme.io/b8674d6-pizzabro.jpg"
        title=""
        width="auto"
      />
    `);
  });
});
