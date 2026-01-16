import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Tabs', () => {
  it.each([
    ['mdxish', (md: string) => {
      const tree = mdxish(md);
      const mod = renderMdxish(tree);
      return <mod.default />;
    }],
    ['mdx renderer', (md: string) => {
      const Component = execute(md);
      return <Component />;
    }],
  ])('renders a tabs component with several tabs with %s', (_, renderFn) => {
    const md = `
<Tabs>
  <Tab title="First Tab">
    Welcome to the content that you can only see inside the first Tab.
  </Tab>
  <Tab title="Second Tab">
    This is content that you can only see inside the second Tab.
  </Tab>
</Tabs>
`;
    const { container } = render(renderFn(md));

    expect(container.querySelector('div.TabGroup')).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(2);
    // Only the first tab is visible at the start
    expect(container.querySelectorAll('div.TabContent')).toHaveLength(1);
    expect(container.querySelectorAll('div.TabContent')[0]).toHaveTextContent('Welcome to the content that you can only see inside the first Tab.');
  });
});
