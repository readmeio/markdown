import { Variable } from '@readme/variable';
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
    const baseProps = {
      defaults: [],
      user: {},
      selected: '',
      changeSelected: () => {},
    };

    it('renders the variable name uppercased as default', () => {
      render(<Variable {...baseProps} variable="apiKey" />);
      expect(screen.getByText('APIKEY')).toBeInTheDocument();
    });

    it('renders user value when provided', () => {
      render(<Variable {...baseProps} user={{ apiKey: 'my-key-123' }} variable="apiKey" />);
      expect(screen.getByText('my-key-123')).toBeInTheDocument();
    });
  });
});
