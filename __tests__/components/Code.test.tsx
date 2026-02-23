import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Code from '../../components/Code';
import { mdxish, renderMdxish } from '../../lib';

describe('Code', () => {
  describe('mdxish', () => {
    it('renders a fenced code block', () => {
      const md = `\`\`\`js
const x = 1;
\`\`\``;
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      expect(container.querySelector('code')).toBeInTheDocument();
      expect(container.textContent).toContain('const x = 1;');
    });

    it('renders inline code', () => {
      const md = 'Use `console.log()` to debug';
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);

      expect(container.querySelector('code')).toBeInTheDocument();
      expect(container.textContent).toContain('console.log()');
    });
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
