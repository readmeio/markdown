import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import MCPIntro from '../../components/MCPIntro';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('MCPIntro', () => {
  describe('mdxish', () => {
    const md = `
<MCPIntro />
`;
    const mod = renderMdxish(mdxish(md));

    it('should render a MCPIntro container', () => {
      const { container } = render(<mod.default />);
      expect(container.querySelector('.MCPIntro')).toBeInTheDocument();
    });

    it('should render skeleton placeholder divs', () => {
      const { container } = render(<mod.default />);
      const divs = container.querySelector('.MCPIntro')!.querySelectorAll('div');
      expect(divs).toHaveLength(6);
    });
  });

  describe('mdx', () => {
    it('renders MCPIntro', () => {
      const md = '<MCPIntro url="https://example.com/mcp" />';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.MCPIntro')).toBeInTheDocument();
    });
  });

  describe('render', () => {
    it('renders a MCPIntro container', () => {
      const { container } = render(<MCPIntro />);
      expect(container.querySelector('.MCPIntro')).toBeInTheDocument();
    });

    it('renders skeleton placeholder divs', () => {
      const { container } = render(<MCPIntro />);
      const divs = container.querySelector('.MCPIntro')!.querySelectorAll('div');
      expect(divs).toHaveLength(6);
    });
  });
});
