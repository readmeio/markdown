import { Variable } from '@readme/variable';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Variable', () => {
  describe('mdxish', () => {
    it('resolves a legacy variable', () => {
      const md = 'Your key is <<apiKey>>';
      const variables = { user: { apiKey: 'key_123' }, defaults: [] };
      const mod = renderMdxish(mdxish(md, { variables }), { variables });
      const { container } = render(<mod.default />);

      expect(container.textContent).toContain('key_123');
      expect(container.textContent).not.toContain('<<apiKey>>');
    });

    it('resolves an mdx variable', () => {
      const md = 'Region: {user.region}';
      const variables = { user: { region: 'us-west-2' }, defaults: [] };
      const mod = renderMdxish(mdxish(md, { variables }), { variables });
      const { container } = render(<mod.default />);

      expect(container.textContent).toContain('us-west-2');
      expect(container.textContent).not.toContain('{user.region}');
    });
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
