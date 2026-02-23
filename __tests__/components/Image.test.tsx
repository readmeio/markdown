import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import Image from '../../components/Image';
import { mdxish, renderMdxish } from '../../lib';

describe('Image', () => {
  describe('mdxish', () => {
    it('renders a markdown image', () => {
      const md = '![Alt text](https://example.com/image.jpg "Title")';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders a markdown image with alt text', () => {
      const md = '![Pizza bro](https://example.com/pizza.jpg)';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
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
  });
});
