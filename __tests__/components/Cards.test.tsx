import type { Element } from 'hast';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';

describe('Cards', () => {
  describe('mdxish', () => {
    describe('given a Cards with Card children', () => {
      const md = `
<Cards>
  <Card title="First">First content</Card>
  <Card title="Second">Second content</Card>
</Cards>
`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render a CardsGrid wrapper', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('.CardsGrid')).toBeInTheDocument();
      });

      it('should render Card children', () => {
        const { container } = render(<mod.default />);
        const cards = container.querySelectorAll('.Card');
        expect(cards).toHaveLength(2);
      });

      it('should render card titles', () => {
        const { container } = render(<mod.default />);
        const titles = container.querySelectorAll('.Card-title');
        expect(titles).toHaveLength(2);
        expect(titles[0]).toHaveTextContent('First');
        expect(titles[1]).toHaveTextContent('Second');
      });
    });

    describe('given a Card with href', () => {
      const md = `
<Cards>
  <Card title="Link Card" href="https://example.com">Linked</Card>
</Cards>
`;
      const mod = renderMdxish(mdxish(md));

      it('should render as an anchor element', () => {
        const { container } = render(<mod.default />);
        const card = container.querySelector('a.Card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveAttribute('href', 'https://example.com');
      });

      it('should render the arrow icon', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('.Card-arrow')).toBeInTheDocument();
      });
    });

    describe('given a Card without href', () => {
      const md = `
<Cards>
  <Card title="Static Card">Static</Card>
</Cards>
`;
      const mod = renderMdxish(mdxish(md));

      it('should render as a div element', () => {
        const { container } = render(<mod.default />);
        const card = container.querySelector('div.Card');
        expect(card).toBeInTheDocument();
      });
    });

    describe('given a Card with icon and badge props', () => {
      const md = `
<Cards>
  <Card title="Featured" icon="fa-star" badge="New">Featured content</Card>
</Cards>
`;
      const mod = renderMdxish(mdxish(md));

      it('should render an icon element', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('.Card-icon')).toBeInTheDocument();
      });

      it('should render a badge element', () => {
        const { container } = render(<mod.default />);
        const badge = container.querySelector('.Card-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('New');
      });

      it('should pass props through the HAST tree', () => {
        const tree = mdxish(md);
        const cardsNode = tree.children[0] as Element;
        const cardChild = cardsNode.children.find(
          (child): child is Element => child.type === 'element' && child.tagName === 'Card',
        );
        expect(cardChild?.properties?.icon).toBe('fa-star');
        expect(cardChild?.properties?.badge).toBe('New');
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });
});
