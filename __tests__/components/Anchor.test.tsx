import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import Anchor from '../../components/Anchor';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Anchor', () => {
  describe('mdxish', () => {
    it('renders a markdown link', () => {
      const md = '[Example](https://example.com)';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('Example');
    });

    it('renders an autolink', () => {
      const md = '<https://example.com>';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('mdx', () => {
    it('renders a markdown link', () => {
      const md = '[Example](https://example.com)';
      const Content = execute(md);
      const { container } = render(<Content />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('Example');
    });
  });

  describe('render', () => {
    it('renders a basic anchor', () => {
      render(<Anchor href="https://example.com">Click me</Anchor>);

      expect(screen.getByRole('link')).toMatchInlineSnapshot(`
        <a
          href="https://example.com"
          target=""
          title=""
        >
          Click me
        </a>
      `);
    });

    it('unwraps nested anchor elements', () => {
      const { container } = render(
        <Anchor href="https://example.com" target="_blank">
          <a href="https://example.com">https://example.com</a>
        </Anchor>,
      );

      const anchors = container.querySelectorAll('a');
      expect(anchors).toHaveLength(1);
      expect(anchors[0]).toMatchInlineSnapshot(`
        <a
          href="https://example.com"
          target="_blank"
          title=""
        >
          https://example.com
        </a>
      `);
    });

    it('preserves non-anchor children', () => {
      render(
        <Anchor href="https://example.com">
          <strong>Bold</strong> and <em>italic</em>
        </Anchor>,
      );

      expect(screen.getByRole('link')).toMatchInlineSnapshot(`
        <a
          href="https://example.com"
          target=""
          title=""
        >
          <strong>
            Bold
          </strong>
           and 
          <em>
            italic
          </em>
        </a>
      `);
    });
  });
});
