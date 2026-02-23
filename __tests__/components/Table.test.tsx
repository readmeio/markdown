import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Table from '../../components/Table';
import { mdxish, renderMdxish } from '../../lib';

describe('Table', () => {
  describe('mdxish', () => {
    describe('given a markdown table', () => {
      const md = `| col1 | col2 |
|---|---|
| a | b |`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render a rdmd-table wrapper', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('.rdmd-table')).toBeInTheDocument();
      });

      it('should render a table element', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('table')).toBeInTheDocument();
      });

      it('should render header cells', () => {
        const { container } = render(<mod.default />);
        const headers = container.querySelectorAll('th');
        expect(headers).toHaveLength(2);
        expect(headers[0]).toHaveTextContent('col1');
        expect(headers[1]).toHaveTextContent('col2');
      });

      it('should render body cells', () => {
        const { container } = render(<mod.default />);
        const cells = container.querySelectorAll('td');
        expect(cells).toHaveLength(2);
        expect(cells[0]).toHaveTextContent('a');
        expect(cells[1]).toHaveTextContent('b');
      });
    });

    describe('given a multi-row table', () => {
      const md = `| name | value |
|---|---|
| foo | 1 |
| bar | 2 |
| baz | 3 |`;
      const mod = renderMdxish(mdxish(md));

      it('should render all rows', () => {
        const { container } = render(<mod.default />);
        const rows = container.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('renders rdmd-table wrapper with table children', () => {
      const { container } = render(
        <Table align={['left', 'right']}>
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody><tr><td>foo</td><td>1</td></tr></tbody>
        </Table>,
      );
      expect(container.querySelector('.rdmd-table')).toBeInTheDocument();
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('th')).toHaveTextContent('Name');
      expect(container.querySelector('td')).toHaveTextContent('foo');
    });
  });
});
