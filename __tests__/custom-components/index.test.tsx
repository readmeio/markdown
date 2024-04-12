import { compile, run } from '../../index';
import React from 'react';

import { render, screen } from '@testing-library/react';

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
    const Page = await run(compile(doc), { components: { Example } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders custom components recursively', async () => {
    const doc = `
<Composite />
    `;

    const Page = await run(compile(doc), { components: { Example, Composite } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });
});
