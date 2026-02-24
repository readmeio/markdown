import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import TailwindRoot from '../../components/TailwindRoot';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('TailwindRoot', () => {
  describe('mdxish', () => {
    it('wraps a component in TailwindRoot when rendered through the pipeline', () => {
      const md = '<Callout icon="📘" theme="info" title="Info">Content</Callout>';
      const mod = renderMdxish(mdxish(md, { useTailwind: true }));
      const { container } = render(<mod.default />);

      expect(container.querySelector('.readme-tailwind')).toBeInTheDocument();
      expect(container.querySelector('.callout')).toBeInTheDocument();
    });
  });

  describe('mdx', () => {
    it('renders TailwindRoot', () => {
      const md = '<TailwindRoot flow={true}>Content</TailwindRoot>';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.readme-tailwind')).toBeInTheDocument();
      expect(container.querySelector('.readme-tailwind')).toHaveTextContent('Content');
    });
  });

  describe('render', () => {
    it('renders a div when flow is true', () => {
      const { container } = render(<TailwindRoot flow={true}>Block</TailwindRoot>);
      expect(container.querySelector('div.readme-tailwind')).toBeInTheDocument();
    });

    it('renders a span when flow is false', () => {
      const { container } = render(<TailwindRoot flow={false}>Inline</TailwindRoot>);
      expect(container.querySelector('span.readme-tailwind')).toBeInTheDocument();
    });

    it('renders children', () => {
      const { container } = render(<TailwindRoot flow={true}>Content</TailwindRoot>);
      expect(container.querySelector('.readme-tailwind')).toHaveTextContent('Content');
    });
  });
});
