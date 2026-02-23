import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';

describe('Heading', () => {
  describe('mdxish', () => {
    describe.each([
      ['# H1', 'h1', 1],
      ['## H2', 'h2', 2],
      ['### H3', 'h3', 3],
      ['#### H4', 'h4', 4],
      ['##### H5', 'h5', 5],
      ['###### H6', 'h6', 6],
    ] as const)('given markdown "%s"', (md, tag, depth) => {
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it(`should render an ${tag} element`, () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector(tag)).toBeInTheDocument();
      });

      it('should have the heading class', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector(`.heading-${depth}`)).toBeInTheDocument();
      });

      it('should render the heading text', () => {
        const { container } = render(<mod.default />);
        const heading = container.querySelector('.heading-text');
        expect(heading).toHaveTextContent(`H${depth}`);
      });

      it('should render an anchor link', () => {
        const { container } = render(<mod.default />);
        const anchor = container.querySelector('a.heading-anchor-icon');
        expect(anchor).toBeInTheDocument();
        expect(anchor?.getAttribute('href')).toMatch(/^#/);
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });
});
