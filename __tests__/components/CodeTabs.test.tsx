import { render } from '@testing-library/react';
import React from 'react';
import { compile, run } from '../../index';

describe('CodeTabs', () => {
  it('render _all_ its children', async () => {
    const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
\`\`\`
assert('theme', 'light');
\`\`\`
    `;
    const Component = await run(compile(md));
    const { container } = render(<Component />);

    expect(container).toHaveTextContent(`assert('theme', 'dark')`);
    expect(container).toHaveTextContent(`assert('theme', 'light')`);
  });
});
