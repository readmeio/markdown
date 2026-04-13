import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import CardsGrid, { Card } from '../../components/Cards';

import { renderingEngines } from './utils';

describe('Cards', () => {
  describe('general component rendering', () => {
    it('renders a CardsGrid wrapper', () => {
      const { container } = render(
        <CardsGrid>
          <Card title="First">Content</Card>
        </CardsGrid>,
      );
      expect(container.querySelector('.CardsGrid')).toBeInTheDocument();
    });

    it('renders Card children with titles', () => {
      const { container } = render(
        <CardsGrid>
          <Card title="First">First</Card>
          <Card title="Second">Second</Card>
        </CardsGrid>,
      );
      const cards = container.querySelectorAll('.Card');
      expect(cards).toHaveLength(2);
      expect(container.querySelectorAll('.Card-title')[0]).toHaveTextContent('First');
    });

    it('renders Card as an anchor when href is provided', () => {
      const { container } = render(
        <CardsGrid>
          <Card href="https://example.com" title="Link">Linked</Card>
        </CardsGrid>,
      );
      const card = container.querySelector('a.Card');
      expect(card).toHaveAttribute('href', 'https://example.com');
      expect(container.querySelector('.Card-arrow')).toBeInTheDocument();
    });

    it('renders Card as a div when no href', () => {
      const { container } = render(
        <CardsGrid>
          <Card title="Static">Static</Card>
        </CardsGrid>,
      );
      expect(container.querySelector('div.Card')).toBeInTheDocument();
    });

    it('renders icon and badge props', () => {
      const { container } = render(
        <CardsGrid>
          <Card badge="New" icon="fa-star" title="Featured">Content</Card>
        </CardsGrid>,
      );
      expect(container.querySelector('.Card-icon')).toBeInTheDocument();
      expect(container.querySelector('.Card-badge')).toHaveTextContent('New');
    });
  });

  describe('given a Cards with Card children', () => {
    const md = `
<Cards>
  <Card title="First">First content</Card>
  <Card title="Second">Second content</Card>
</Cards>
    `;

    it.each(renderingEngines)('%s: renders a CardsGrid wrapper containing Card children', (_label, renderContent) => {
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.CardsGrid')).toBeInTheDocument();
      expect(container.querySelectorAll('.Card')).toHaveLength(2);
      expect(container.querySelectorAll('.Card-title')).toHaveLength(2);
      expect(container).toMatchSnapshot();
    });
  });

  describe('given a Card with href', () => {
    const md = `
<Cards>
  <Card title="Link Card" href="https://example.com">Linked</Card>
</Cards>
    `;

    it.each(renderingEngines)('%s: renders a Card as an anchor element', (_label, renderContent) => {
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('a.Card')).toBeInTheDocument();
      expect(container.querySelector('a.Card')).toHaveAttribute('href', 'https://example.com');
      expect(container.querySelector('.Card-arrow')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('given a Card without href', () => {
    const md = `
<Cards>
  <Card title="Static Card">Static</Card>
</Cards>
    `;

    it.each(renderingEngines)('%s: renders a Card as a div element', (_label, renderContent) => {
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('div.Card')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('given a Card with icon and badge props', () => {
    const md = `
<Cards>
  <Card title="Featured" icon="fa-star" badge="New">Featured content</Card>
</Cards>
    `;

    it.each(renderingEngines)('%s: renders an icon and badge element', (_label, renderContent) => {
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.Card-icon')).toBeInTheDocument();
      expect(container.querySelector('.Card-badge')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('given various card structures', () => {
    it.each(renderingEngines)('%s: should parse where there is space after the opening tag and before the closing tag', (_label, renderContent) => {
      const mdWithSpaces = `
<Cards>
  <Card title="First">Content</Card>
  <Card title="Second">More</Card>
</Cards>
      `;
      const mdWithoutSpaces = `

<Cards>

  <Card title="First">Content</Card>

  <Card title="Second">More</Card>
</Cards>
      `;

      const ContentWithSpaces = renderContent(mdWithSpaces);
      const { container: containerWithSpaces } = render(<ContentWithSpaces />);
      const ContentWithoutSpaces = renderContent(mdWithoutSpaces);
      const { container: containerWithoutSpaces } = render(<ContentWithoutSpaces />);

      expect(containerWithSpaces.innerHTML).toBe(containerWithoutSpaces.innerHTML);
    });

    it.each(renderingEngines)('%s: should parse when the code is in one line', (_label, renderContent) => {
      const md = '<Cards><Card title="First">Content</Card><Card title="Second">More</Card></Cards>';
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.CardsGrid')).toBeInTheDocument();
      const cards = container.querySelectorAll('.Card');
      expect(cards).toHaveLength(2);
      expect(container).toMatchSnapshot();
    });
  });
});