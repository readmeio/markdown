import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import TailwindRoot from '../../components/TailwindRoot';

describe('TailwindRoot', () => {
  describe('mdxish', () => {
    describe('given flow=true (block-level)', () => {
      it('should not error when rendering', () => {
        expect(() => render(<TailwindRoot flow={true}>Content</TailwindRoot>)).not.toThrow();
      });

      it('should render a div element', () => {
        const { container } = render(<TailwindRoot flow={true}>Content</TailwindRoot>);
        const root = container.querySelector('div.readme-tailwind');
        expect(root).toBeInTheDocument();
      });

      it('should render children', () => {
        const { container } = render(<TailwindRoot flow={true}>Content</TailwindRoot>);
        const root = container.querySelector('.readme-tailwind');
        expect(root).toHaveTextContent('Content');
      });
    });

    describe('given flow=false (inline)', () => {
      it('should render a span element', () => {
        const { container } = render(<TailwindRoot flow={false}>Inline</TailwindRoot>);
        const root = container.querySelector('span.readme-tailwind');
        expect(root).toBeInTheDocument();
      });

      it('should render children', () => {
        const { container } = render(<TailwindRoot flow={false}>Inline</TailwindRoot>);
        const root = container.querySelector('.readme-tailwind');
        expect(root).toHaveTextContent('Inline');
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it.todo('should render the component directly');
  });
});
