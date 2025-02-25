import type { RMDXModule } from '../../types';

import { render, screen } from '@testing-library/react';
import React from 'react';

import { compile, run } from '../../lib';
import { execute } from '../helpers';

describe('Custom Components', () => {
  const Example = 'It works!';
  const Multiple = `
export const First = () => <div>First</div>;
export const Second = () => <div>Second</div>;
  `;
  const Nesting = `
export const WithChildren = ({ children }) => <div>{children}</div>;

<div>{props.children}</div>
`;

  it('renders custom components', async () => {
    const doc = `
<Example />
    `;
    const Page = (await execute(
      doc,
      { components: { Example } },
      { components: { Example } },
    )) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders a custom component with multiple exports', async () => {
    const doc = `
<First />

<Second />
    `;
    const Page = (await execute(
      doc,
      { components: { Multiple } },
      { components: { Multiple } },
    )) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('First')).toBeVisible();
    expect(screen.getByText('Second')).toBeVisible();
  });

  it('renders a nested exported custom component', async () => {
    const doc = '<Nesting><WithChildren>Hello, Test User!</WithChildren></Nesting>';
    const Page = (await execute(
      doc,
      { components: { Nesting } },
      { components: { Nesting } },
    )) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('Hello, Test User!')).toBeVisible();
  });

  it('renders the default export of a custom component and passes through props', async () => {
    const Test = '{props.attr}';
    const doc = '<Test attr="Hello" />';
    const Page = await run(await compile(doc, { components: { Test } }), { components: { Test } });
    render(<Page.default />);

    expect(screen.getByText('Hello')).toBeVisible();
  });
});
