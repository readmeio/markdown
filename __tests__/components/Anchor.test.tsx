import { render, screen } from '@testing-library/react';
import React from 'react';

import Anchor from '../../components/Anchor';

describe('Anchor', () => {
  describe('mdxish', () => {
    it.todo('should render through the mdxish pipeline');
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
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
