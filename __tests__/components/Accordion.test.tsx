import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { expect } from 'vitest';

import Accordion from '../../components/Accordion';

import { renderingEngines } from './utils';

describe('Accordion', () => {
  describe('general component rendering', () => {
    it('renders its title', () => {
      render(<Accordion title="My Section">content</Accordion>);
      expect(screen.getByText('My Section')).toBeVisible();
    });

    it('renders its children', () => {
      render(
        <Accordion title="Section">
          <p>Body content</p>
        </Accordion>,
      );
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('renders without an icon when icon prop is omitted', () => {
      const { container } = render(<Accordion title="No Icon">content</Accordion>);
      expect(container.querySelector('.Accordion-icon')).toBeNull();
    });

    it('starts in a closed state', () => {
      const { container } = render(<Accordion title="Section">content</Accordion>);
      expect(container.querySelector('.Accordion-toggleIcon')).toBeInTheDocument();
      expect(container.querySelector('.Accordion-toggleIcon_opened')).toBeNull();
    });
  });

  describe('icon prop', () => {
    it('renders a Font Awesome icon as an <i> element', () => {
      const { container } = render(
        <Accordion icon="fa-book" title="Section">
          content
        </Accordion>,
      );
      const icon = container.querySelector('i.Accordion-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('fa-duotone', 'fa-solid', 'fa-book');
    });

    it('applies iconColor to a Font Awesome icon', () => {
      const { container } = render(
        <Accordion icon="fa-star" iconColor="red" title="Section">
          content
        </Accordion>,
      );
      expect(container.querySelector('i.Accordion-icon')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('renders an emoji as a <span> element', () => {
      const { container } = render(
        <Accordion icon="🚀" title="Section">
          content
        </Accordion>,
      );
      const icon = container.querySelector('span.Accordion-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🚀');
    });

    it('does not render an <i> element for an emoji icon', () => {
      const { container } = render(
        <Accordion icon="🚀" title="Section">
          content
        </Accordion>,
      );
      expect(container.querySelector('i.Accordion-icon')).toBeNull();
    });
  });

  describe.each(renderingEngines)('%s', (_label, renderContent) => {
    it('renders an accordion with a Font Awesome icon', () => {
      const md = `<Accordion icon="fa-book" title="My Section">
Content here
</Accordion>`;
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('details.Accordion')).toBeInTheDocument();
      expect(container.querySelector('i.Accordion-icon')).toHaveClass('fa-book');
      expect(container).toMatchSnapshot();
    });

    it('renders an accordion with an emoji icon', () => {
      const md = `<Accordion icon="🚀" title="My Section">
Content here
</Accordion>`;
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('details.Accordion')).toBeInTheDocument();
      expect(container.querySelector('span.Accordion-icon')).toHaveTextContent('🚀');
      expect(container).toMatchSnapshot();
    });

    it('renders an accordion with no icon', () => {
      const md = `<Accordion title="My Section">
Content here
</Accordion>`;
      const Content = renderContent(md);
      const { container } = render(<Content />);

      expect(container.querySelector('details.Accordion')).toBeInTheDocument();
      expect(container.querySelector('.Accordion-icon')).toBeNull();
      expect(container).toMatchSnapshot();
    });
  });
});
