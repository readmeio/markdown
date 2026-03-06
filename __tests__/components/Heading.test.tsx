import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import CreateHeading from '../../components/Heading';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

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
    it('renders a heading from markdown', () => {
      const md = '## My Heading';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('.heading-text')).toHaveTextContent('My Heading');
    });

    it('renders an anchor link on headings', () => {
      const md = '## Anchor Test';
      const Content = execute(md);
      const { container } = render(<Content />);

      const anchor = container.querySelector('a.heading-anchor-icon');
      expect(anchor).toBeInTheDocument();
      expect(anchor?.getAttribute('href')).toMatch(/^#/);
    });
  });

  describe('render', () => {
    it.each([1, 2, 3, 4, 5, 6] as const)('renders an h%i element', depth => {
      const Heading = CreateHeading(depth);
      const { container } = render(<Heading depth={depth} id="test" tag={`h${depth}`}>Title</Heading>);
      expect(container.querySelector(`h${depth}.heading-${depth}`)).toBeInTheDocument();
    });

    it('renders heading text and anchor link', () => {
      const Heading = CreateHeading(2);
      const { container } = render(<Heading depth={2} id="my-heading" tag="h2">My Heading</Heading>);
      expect(container.querySelector('.heading-text')).toHaveTextContent('My Heading');
      const anchor = container.querySelector('a.heading-anchor-icon');
      expect(anchor).toHaveAttribute('href', '#my-heading');
    });

    it('returns empty string when children is falsy', () => {
      const Heading = CreateHeading(1);
      const { container } = render(<Heading depth={1} id="empty" tag="h1">{null}</Heading>);
      expect(container.querySelector('h1')).not.toBeInTheDocument();
    });
  });
});
