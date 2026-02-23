import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import Callout from '../../components/Callout';
import { mdxish, renderMdxish } from '../../lib';

describe('Callout', () => {
  describe('mdxish', () => {
    it('renders a callout with emoji and title', () => {
      const md = `> ❗️ Error Callout
>
> Something went wrong.`;
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      expect(container.querySelector('.callout')).toBeInTheDocument();
      expect(container.textContent).toContain('Error Callout');
      expect(container.textContent).toContain('Something went wrong.');
    });

    it('renders a callout with no title', () => {
      const md = `> 🚧
>
> Callout content`;
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
      expect(container.textContent).toContain('Callout content');
    });

    it('renders a regular blockquote without emoji', () => {
      const md = '> Hello world';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      expect(container.querySelector('blockquote')).toBeInTheDocument();
      expect(container.querySelector('.callout')).not.toBeInTheDocument();
      expect(container.textContent).toContain('Hello world');
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('render _all_ its children', () => {
      render(
        <Callout icon="icon" theme="theme" title="Title">
          <p>Title</p>
          <p>First Paragraph</p>
          <p>Second Paragraph</p>
        </Callout>,
      );

      expect(screen.getByText('Second Paragraph')).toBeVisible();
    });

    it("doesn't render all its children if it's **empty**", () => {
      render(
        <Callout empty icon="icon" theme="theme">
          <p>Title</p>
          <p>First Paragraph</p>
          <p>Second Paragraph</p>
        </Callout>,
      );

      expect(screen.queryByText('Title')).toBeNull();
    });
  });
});
