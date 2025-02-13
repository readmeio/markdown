import React from 'react';

import { render, screen } from '@testing-library/react';
import { execute } from '../helpers';

describe('Custom Components', async () => {
  const Example = await execute(`It works!`, {}, {}, { getDefault: false });
  const Multiple = await execute(
    `
export const First = () => <div>First</div>;
export const Second = () => <div>Second</div>;
`,
    {},
    {},
    { getDefault: false },
  );

  it('renders custom components', async () => {
    const doc = `
<Example />
    `;
    const Page = await execute(doc, undefined, { components: { Example } });
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders a custom component with multiple exports', async () => {
    const doc = `
<First />

<Second />
    `;
    const Page = await execute(doc, undefined, { components: { Multiple } });
    render(<Page />);

    expect(screen.getByText('First')).toBeVisible();
    expect(screen.getByText('Second')).toBeVisible();
  });

  it('renders the default export of a custom component and passes through props', async () => {
    const Test = await execute(`{props.attr}`, {}, {}, { getDefault: true });
    const doc = `<Test attr="Hello" />`;
    const Page = await execute(doc, undefined, { components: { Test } });
    render(<Page />);

    expect(screen.getByText('Hello')).toBeVisible();
  });
});
