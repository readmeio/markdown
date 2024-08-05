import { render } from '@testing-library/react';

import { react } from '../../index';

describe('Callout', () => {
  it('render _all_ its children', () => {
    const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
    `;
    const { container } = render(react(md, { theme: 'dark' }));

    expect(container.querySelector('code.theme-dark')).toBeVisible();
  });
});
