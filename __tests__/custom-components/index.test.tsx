import React from 'react';

import { render, screen } from '@testing-library/react';
import { execute } from '../helpers';

describe('Custom Components', () => {
  const Example = () => <div>It works!</div>;
  const Composite = () => (
    <>
      <div>Does it work?</div>
      <Example />
    </>
  );

  it('renders custom components', async () => {
    const doc = `
<Example />
    `;
    const Page = await execute(doc, undefined, { components: { Example } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders custom components recursively', async () => {
    const doc = `
<Composite />
    `;

    const Page = await execute(doc, undefined, { components: { Example, Composite } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });
});
