import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import TableOfContents from '../../components/TableOfContents';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Table of Contents', () => {
  describe('mdxish', () => {
    it('renders a Toc from headings', () => {
      const md = `# Title

## Subheading

### Third`;
      const { Toc } = renderMdxish(mdxish(md));
      render(<Toc />);

      expect(screen.findByText('Title')).toBeDefined();
      expect(screen.findByText('Subheading')).toBeDefined();
      expect(screen.findByText('Third')).toBeDefined();
    });

    it('limits toc depth to 3', () => {
      const md = `# Title

## Sub

### Third

#### Fourth`;
      const { Toc } = renderMdxish(mdxish(md));
      render(<Toc />);

      expect(screen.findByText('Title')).toBeDefined();
      expect(screen.queryByText('Fourth')).toBeNull();
    });
  });

  describe('mdx', () => {
    it('generates a Toc from headings', () => {
      const md = '# Title\n\n## Subheading';
      const mod = execute(md, {}, {}, { getDefault: false });
      render(<mod.Toc />);

      expect(screen.findByText('Title')).toBeDefined();
      expect(screen.findByText('Subheading')).toBeDefined();
    });
  });

  describe('render', () => {
    it('should have a header', () => {
      const { container } = render(
        <TableOfContents>
          <h1>Heading 1</h1>
        </TableOfContents>,
      );

      expect(container.querySelectorAll('li')[0]).toHaveTextContent('Table of Contents');
    });

    it('generates TOC from headings', () => {
      const md = '# Heading Zed\n\n# Heading One';
      const mod = execute(md, {}, {}, { getDefault: false });
      const { container } = render(<mod.Toc />);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    });

    it('includes two heading levels', () => {
      const md = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
      const mod = execute(md, {}, {}, { getDefault: false });
      const { container } = render(<mod.Toc />);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    });

    it('normalizes root depth level', () => {
      const md = '##### Heading Zed\n\n###### Subheading Zed';
      const mod = execute(md, {}, {}, { getDefault: false });
      const { container } = render(<mod.Toc />);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    });

    it('includes variables', () => {
      const md = '# Heading {user.test}';
      const variables = { user: { test: 'value123' }, defaults: [] };
      const mod = execute(md, {}, { variables }, { getDefault: false });
      const { container } = render(<mod.Toc />);

      expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
        'Heading value123',
      );
    });

    it('falls back to field name for missing variables in TOC', () => {
      const md = '# Heading {user.unknown}';
      const variables = { user: {}, defaults: [] };
      const mod = execute(md, {}, { variables }, { getDefault: false });
      const { container } = render(<mod.Toc />);

      expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
        'Heading unknown',
      );
    });

    it('accepts custom heading', () => {
      const { container } = render(
        <TableOfContents heading="Custom Heading">
          <h1>Heading 1</h1>
        </TableOfContents>,
      );

      expect(container.querySelectorAll('li')[0]).toHaveTextContent('Custom Heading');
    });
  });
});
