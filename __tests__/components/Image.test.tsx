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
        aria-label="Expand image"
        class="img lightbox closed"
        role="button"
        tabindex="0"
      >
        <span
          class="lightbox-inner"
        >
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
        </span>
      </span>
    `);
  });

  it('should wrap in an img-frame div when framed', () => {
    const { container } = render(
      <Image align="left" framed="true" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" />
    );

    expect(container.querySelector('.img-frame')).toMatchInlineSnapshot(`
      <div
        class="img-frame img-frame-left"
      >
        <span
          aria-label="Expand image"
          class="img lightbox closed"
          role="button"
          tabindex="0"
        >
          <span
            class="lightbox-inner"
          >
            <img
              alt=""
              class="img img-align-center "
              height="auto"
              loading="lazy"
              src="https://files.readme.io/b8674d6-pizzabro.jpg"
              title=""
              width="auto"
            />
          </span>
        </span>
      </div>
    `);
  });

  it('should hoist percentage width onto a left-aligned framed wrapper', () => {
    const { container } = render(
      <Image align="left" framed="true" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" width="50%" />
    );

    const frame = container.querySelector('.img-frame');
    expect(frame).toHaveAttribute('style', 'width: 50%;');
  });

  it('should hoist percentage width onto a right-aligned framed wrapper', () => {
    const { container } = render(
      <Image align="right" framed="true" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" width="50%" />
    );

    const frame = container.querySelector('.img-frame');
    expect(frame).toHaveAttribute('style', 'width: 50%;');
  });

  it('should leave a center-aligned framed wrapper full width (no hoisted percentage width)', () => {
    const { container } = render(
      <Image align="center" framed="true" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" width="50%" />
    );

    const frame = container.querySelector('.img-frame');
    expect(frame).not.toHaveAttribute('style');
  });

  it('should leave a default-aligned framed wrapper full width (no hoisted percentage width)', () => {
    const { container } = render(
      <Image framed="true" lazy={true} src="https://files.readme.io/b8674d6-pizzabro.jpg" width="50%" />
    );

    const frame = container.querySelector('.img-frame');
    expect(frame).toHaveClass('img-frame-center');
    expect(frame).not.toHaveAttribute('style');
  });

  it('should wrap in an img-frame figure with a sibling figcaption when framed with a caption', () => {
    const { container } = render(
      <Image
        caption="Framed pizza bro"
        framed="true"
        lazy={true}
        src="https://files.readme.io/b8674d6-pizzabro.jpg"
      />
    );

    expect(container.querySelector('.img-frame')).toMatchInlineSnapshot(`
      <figure
        class="img-frame img-frame-center"
      >
        <span
          aria-label="Expand image"
          class="img lightbox closed"
          role="button"
          tabindex="0"
        >
          <span
            class="lightbox-inner"
          >
            <img
              alt=""
              class="img img-align-center "
              height="auto"
              loading="lazy"
              src="https://files.readme.io/b8674d6-pizzabro.jpg"
              title=""
              width="auto"
            />
          </span>
        </span>
        <figcaption>
          Framed pizza bro
        </figcaption>
      </figure>
    `);
  });
});
