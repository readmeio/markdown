import { render } from '@testing-library/react';

import { compile, run } from '../../index';

describe.skip('Callout', () => {
  it('render _all_ its children', () => {
    const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
    `;
    const { container } = render(run(compile(md, { theme: 'dark' })));

    expect(container.querySelector('code.theme-dark')).toBeVisible();
  });
});
