import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import Image from '../../components/Image';

import { captureMdxishProps, renderingEngines } from './utils';

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

  it('should add img-no-wrap to the frame wrapper when wrap is disabled for left/right alignment', () => {
    const { container } = render(
      <Image align="right" framed="true" src="https://files.readme.io/b8674d6-pizzabro.jpg" wrap={false} />,
    );

    expect(container.querySelector('.img-frame')).toHaveClass('img-no-wrap');
  });

  it('should not add img-no-wrap when wrap is omitted (backwards compatible)', () => {
    const { container } = render(
      <Image align="right" framed="true" src="https://files.readme.io/b8674d6-pizzabro.jpg" />,
    );

    expect(container.querySelector('.img-frame')).not.toHaveClass('img-no-wrap');
  });

  it('should not add img-no-wrap for center alignment even when wrap is false', () => {
    const { container } = render(
      <Image align="center" framed="true" src="https://files.readme.io/b8674d6-pizzabro.jpg" wrap={false} />,
    );

    expect(container.querySelector('.img-frame')).not.toHaveClass('img-no-wrap');
  });

  it('mdxish: <Image style="..."> renders without crashing and receives style as an object', () => {
    const md = '<Image src="https://files.readme.io/x.jpg" alt="x" style="color: red" />';
    const [, renderMdxishContent] = renderingEngines.find(([label]) => label === 'mdxish')!;
    const Content = renderMdxishContent(md);

    expect(() => render(<Content />)).not.toThrow();

    const captured = captureMdxishProps(md, 'img');
    expect(typeof captured.style).toBe('object');
    expect(captured.style).toMatchObject({ color: 'red' });
  });
});
