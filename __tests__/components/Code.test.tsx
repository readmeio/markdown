import { render } from '@testing-library/react';
import React from 'react';

import Code from '../../components/Code';

describe('Code', () => {
  describe('mdxish', () => {
    it.todo('should render through the mdxish pipeline');
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('renders a code element', () => {
      const { container } = render(<Code>{'console.log("hi");'}</Code>);
      expect(container.querySelector('code.rdmd-code')).toBeInTheDocument();
    });

    it('renders children as code content', () => {
      const { container } = render(<Code>{'console.log("hi");'}</Code>);
      expect(container).toHaveTextContent('console.log("hi");');
    });

    it('handles undefined children', () => {
      const { container } = render(<Code />);
      expect(container).toHaveTextContent('');
    });
  });
});
