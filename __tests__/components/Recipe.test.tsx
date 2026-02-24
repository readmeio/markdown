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

    it('should render the skeleton structure', () => {
      const { container } = render(<mod.default />);
      expect(container.querySelectorAll('div')).toHaveLength(6);
    });
  });

  describe('mdx', () => {
    it('renders Recipe skeleton', () => {
      const md = '<Recipe />';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.querySelectorAll('div')).toHaveLength(6);
    });
  });

  describe('render', () => {
    it('renders the skeleton structure', () => {
      const { container } = render(<Recipe />);
      expect(container.querySelectorAll('div')).toHaveLength(6);
    });
  });
});
