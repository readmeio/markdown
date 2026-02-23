import type { Element } from 'hast';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';

describe('Columns', () => {
  describe('mdxish', () => {
    describe('given Columns with two Column children', () => {
      const md = `
<Columns>
  <Column>Col 1</Column>
  <Column>Col 2</Column>
</Columns>
`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render a Columns wrapper with grid style', () => {
        const { container } = render(<mod.default />);
        const columns = container.querySelector('.Columns');
        expect(columns).toBeInTheDocument();
        expect(columns).toHaveStyle({ gridTemplateColumns: 'repeat(2, auto)' });
      });

      it('should render Column children', () => {
        const { container } = render(<mod.default />);
        const cols = container.querySelectorAll('.Column');
        expect(cols).toHaveLength(2);
        expect(cols[0]).toHaveTextContent('Col 1');
        expect(cols[1]).toHaveTextContent('Col 2');
      });
    });

    describe('given Columns with three children', () => {
      const md = `
<Columns>
  <Column>A</Column>
  <Column>B</Column>
  <Column>C</Column>
</Columns>
`;
      const mod = renderMdxish(mdxish(md));

      it('should set grid columns based on child count', () => {
        const { container } = render(<mod.default />);
        const columns = container.querySelector('.Columns');
        expect(columns).toHaveStyle({ gridTemplateColumns: 'repeat(3, auto)' });
      });
    });

    describe('given Columns with the HAST tree', () => {
      const md = `
<Columns>
  <Column>Col 1</Column>
  <Column>Col 2</Column>
</Columns>
`;

      it('should produce Column children in the tree', () => {
        const tree = mdxish(md);
        const columnsNode = tree.children[0] as Element;
        expect(columnsNode.tagName).toBe('Columns');

        const columnChildren = columnsNode.children.filter(
          (child): child is Element => child.type === 'element' && child.tagName === 'Column',
        );
        expect(columnChildren).toHaveLength(2);
      });
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it.todo('should render the component directly');
  });
});
