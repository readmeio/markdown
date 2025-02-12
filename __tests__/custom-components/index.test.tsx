import type { RMDXModule } from '../../types';

import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('Custom Components', () => {
  let Example;
  let Multiple;

  beforeEach(async () => {
    Example = await execute('It works!', {}, {}, { getDefault: false });
    Multiple = await execute(
      `
export const First = () => <div>First</div>;
export const Second = () => <div>Second</div>;
  `,
      {},
      {},
      { getDefault: false },
    );
  });

  it('renders custom components', async () => {
    const doc = `
<Example />
    `;
    const Page = (await execute(doc, undefined, { components: { Example } })) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders a custom component with multiple exports', async () => {
    const doc = `
<First />

<Second />
    `;
    const Page = (await execute(doc, undefined, { components: { Multiple } })) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('First')).toBeVisible();
    expect(screen.getByText('Second')).toBeVisible();
  });
});
