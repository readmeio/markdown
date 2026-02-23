import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Accordion from '../../components/Accordion';
import { mdxish, renderMdxish } from '../../lib';

describe('Accordion', () => {
  describe('mdxish', () => {
    describe('given a basic Accordion', () => {
      const md = `
<Accordion title="Title">Content</Accordion>
`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render a details element with Accordion class', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('details.Accordion')).toBeInTheDocument();
      });

      it('should render a summary with the title', () => {
        const { container } = render(<mod.default />);
        const summary = container.querySelector('summary.Accordion-title');
        expect(summary).toBeInTheDocument();
        expect(summary).toHaveTextContent('Title');
      });

      it('should render children in Accordion-content', () => {
        const { container } = render(<mod.default />);
        const content = container.querySelector('.Accordion-content');
        expect(content).toBeInTheDocument();
        expect(content).toHaveTextContent('Content');
      });
    });

    describe('given an Accordion with icon props', () => {
      const md = `
<Accordion title="Settings" icon="fa-gear" iconColor="#FF0000">Settings content</Accordion>
`;
      const mod = renderMdxish(mdxish(md));

      it('should render an icon element', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('i.Accordion-icon')).toBeInTheDocument();
      });

      it('should apply the icon color style', () => {
        const { container } = render(<mod.default />);
        const icon = container.querySelector('i.Accordion-icon');
        expect(icon).toHaveStyle({ color: '#FF0000' });
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('renders a details element with Accordion class', () => {
      const { container } = render(<Accordion title="Title">Content</Accordion>);
      expect(container.querySelector('details.Accordion')).toBeInTheDocument();
    });

    it('renders a summary with the title', () => {
      const { container } = render(<Accordion title="Title">Content</Accordion>);
      const summary = container.querySelector('summary.Accordion-title');
      expect(summary).toHaveTextContent('Title');
    });

    it('renders children in Accordion-content', () => {
      const { container } = render(<Accordion title="Title">Content</Accordion>);
      expect(container.querySelector('.Accordion-content')).toHaveTextContent('Content');
    });

    it('renders an icon when icon prop is provided', () => {
      const { container } = render(<Accordion icon="fa-gear" iconColor="#FF0000" title="Title">Content</Accordion>);
      const icon = container.querySelector('i.Accordion-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveStyle({ color: '#FF0000' });
    });
  });
});
