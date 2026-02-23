import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('MCPIntro renderer', () => {
  const md = `
<MCPIntro />
`;
  const mod = renderMdxish(mdxish(md));

  it('should not error when rendering', () => {
    expect(() => render(<mod.default />)).not.toThrow();
  });

  it('should render a MCPIntro container', () => {
    const { container } = render(<mod.default />);
    expect(container.querySelector('.MCPIntro')).toBeInTheDocument();
  });

  it('should render skeleton placeholder divs', () => {
    const { container } = render(<mod.default />);
    const mcpIntro = container.querySelector('.MCPIntro');
    const divs = mcpIntro?.querySelectorAll('div');
    expect(divs!.length).toBeGreaterThan(1);
  });
});
