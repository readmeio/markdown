import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('Recipe renderer', () => {
  const md = `
<Recipe />
`;
  const mod = renderMdxish(mdxish(md));

  it('should not error when rendering', () => {
    expect(() => render(<mod.default />)).not.toThrow();
  });

  it('should render skeleton placeholder divs', () => {
    const { container } = render(<mod.default />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(1);
  });
});
