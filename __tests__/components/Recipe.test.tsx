import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Recipe from '../../components/Recipe';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Recipe', () => {
  describe('mdxish', () => {
    const md = `
<Recipe />
`;
    const mod = renderMdxish(mdxish(md));

    it('should not error when rendering', () => {
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it('should render skeleton placeholder divs', () => {
      const { container } = render(<mod.default />);
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(1);
    });
  });

  describe('mdx', () => {
    it('renders Recipe', () => {
      const md = '<Recipe />';
      const Content = execute(md);
      const { container } = render(<Content />);

      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(1);
    });
  });

  describe('render', () => {
    it('renders skeleton placeholder divs', () => {
      const { container } = render(<Recipe />);
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(1);
    });
  });
});
