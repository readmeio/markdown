import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import React from 'react';

import { expect } from 'vitest';

import Icon from '../../components/Icon';

describe('Icon', () => {
  describe('Font Awesome icons', () => {
    it('renders an <i> for a bare fa- icon with the fa-duotone fa-solid fallback', () => {
      const { container } = render(<Icon className="Test-icon" icon="fa-book" />);
      const icon = container.querySelector('i.Test-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('fa-duotone', 'fa-solid', 'fa-book');
    });

    it('does not double the fad prefix when icon already has it', () => {
      const { container } = render(<Icon className="Test-icon" icon="fad fa-book" />);
      const icon = container.querySelector('i.Test-icon');
      expect(icon).toHaveClass('fad', 'fa-book');
      expect(icon?.className.match(/fad/g)).toHaveLength(1);
    });

    it.each(['fa', 'fab', 'fal', 'far', 'fas', 'fat', 'fass', 'fasr', 'fasl', 'fast'])(
      'respects the %s prefix without adding fad',
      prefix => {
        const { container } = render(<Icon className="Test-icon" icon={`${prefix} fa-circle`} />);
        const icon = container.querySelector('i.Test-icon');
        expect(icon).toHaveClass(prefix, 'fa-circle');
        expect(icon).not.toHaveClass('fad');
      },
    );

    it('applies iconColor as an inline color style', () => {
      const { container } = render(<Icon className="Test-icon" icon="fa-star" iconColor="red" />);
      expect(container.querySelector('i.Test-icon')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('omits the style attribute when iconColor is not provided', () => {
      const { container } = render(<Icon className="Test-icon" icon="fa-star" />);
      expect(container.querySelector('i.Test-icon')).not.toHaveAttribute('style');
    });

    it('does not render a <span> for a Font Awesome icon', () => {
      const { container } = render(<Icon className="Test-icon" icon="fa-book" />);
      expect(container.querySelector('span.Test-icon')).toBeNull();
    });
  });

  describe('non-Font-Awesome icons', () => {
    it('renders a <span> for an emoji', () => {
      const { container } = render(<Icon className="Test-icon" icon="🚀" />);
      const icon = container.querySelector('span.Test-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🚀');
    });

    it('does not render an <i> for an emoji', () => {
      const { container } = render(<Icon className="Test-icon" icon="🚀" />);
      expect(container.querySelector('i.Test-icon')).toBeNull();
    });

    it('forwards the className to the <span>', () => {
      const { container } = render(<Icon className="My-icon" icon="⭐" />);
      expect(container.querySelector('span.My-icon')).toBeInTheDocument();
    });
  });
});
