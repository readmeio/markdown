import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('Variable', () => {
  describe('mdxish', () => {
    it.todo('should render through the mdxish pipeline');
  });

  describe('mdx', () => {
    it('render a variable', () => {
      const md = '<Variable variable="name" />';
      const Content = execute(md);

      render(<Content />);

      expect(screen.getByText('NAME')).toBeVisible();
    });
  });

  describe('render', () => {
    it.todo('should render the component directly');
  });
});
