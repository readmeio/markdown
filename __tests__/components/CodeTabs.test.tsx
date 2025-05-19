import { render } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('CodeTabs', () => {
  it.skip('render _all_ its children', () => {
    const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
\`\`\`
assert('theme', 'light');
\`\`\`
    `;
    const Component = execute(md);
    const { container } = render(<Component />);

    expect(container).toHaveTextContent("assert('theme', 'dark')");
    expect(container).toHaveTextContent("assert('theme', 'light')");
  });
});
