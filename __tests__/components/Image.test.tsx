import { render, screen } from '@testing-library/react';
import React from 'react';

import Image from '../../components/Image';

describe('Image', () => {
  it('should render', () => {
    render(<Image align="center" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" />);

    expect(screen.getByRole('img')).toMatchInlineSnapshot(`
      <img
        alt=""
        class="img img-align-center "
        height="auto"
        loading="lazy"
        src="https://files.readme.io/b8674d6-pizzabro.jpg"
        title=""
        width="auto"
      />
    `);
  });

  it('should render as a figure/figcaption if it has a caption', () => {
    render(
      <Image
        align="center"
        caption="A pizza bro"
        lazy={true}
        src="https://files.readme.io/b8674d6-pizzabro.jpg"
      />
    );

    expect(screen.getByRole('button')).toMatchInlineSnapshot(`
      <span
        aria-label=""
        class="img lightbox closed"
        role="button"
        tabindex="0"
      >
        <span
          class="lightbox-inner"
        >
          <figure>
            <img
              alt=""
              class="img img-align-center "
              height="auto"
              loading="lazy"
              src="https://files.readme.io/b8674d6-pizzabro.jpg"
              title=""
              width="auto"
            />
            <figcaption>
              A pizza bro
            </figcaption>
          </figure>
        </span>
      </span>
    `);
  });
});
