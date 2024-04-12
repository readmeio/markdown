import { compile, run } from '../../index';
import React from 'react';

import { render, screen } from '@testing-library/react';

describe('Custom Components', () => {
  const Example = `**It works!**`;
  const Composite = `
## Does it work?

<Example />
`;

  it('renders custom components', async () => {
    const doc = `
<Example />
    `;
    const Page = await run(compile(doc), { components: { Example } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it.skip('renders custom components recursively', async () => {
    const doc = `
<Composite />
    `;

    const Page = await run(compile(doc), { components: { Example, Composite } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });
});
