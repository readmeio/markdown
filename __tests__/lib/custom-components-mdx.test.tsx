import type { RMDXModule } from '../../types';

import { render, screen } from '@testing-library/react';
import React from 'react';

import { compile, run } from '../../lib';
import { execute } from '../helpers';

describe('Custom Components', () => {
  let Example;
  let Multiple;
  let Nesting;

  beforeEach(() => {
    Example = execute('It works!', {}, {}, { getDefault: false });
    Multiple = execute(
      `
export const First = () => <div>First</div>;
export const Second = () => <div>Second</div>;
  `,
      {},
      {},
      { getDefault: false },
    );
    Nesting = execute(
      `
export const WithChildren = ({ children }) => <div>{children}</div>;

<div>{props.children}</div>
`,
      {},
      {},
      { getDefault: false },
    );
  });

  it('renders custom components', () => {
    const doc = `
<Example />
    `;
    const Page = execute(doc, { components: { Example } }, { components: { Example } }) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('It works!')).toBeVisible();
  });

  it('renders a custom component with multiple exports', () => {
    const doc = `
<First />

<Second />
    `;
    const Page = execute(
      doc,
      { components: { Multiple, First: Multiple, Second: Multiple } },
      { components: { Multiple } },
    ) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('First')).toBeVisible();
    expect(screen.getByText('Second')).toBeVisible();
  });

  it('renders a nested exported custom component', () => {
    const doc = '<Nesting><WithChildren>Hello, Test User!</WithChildren></Nesting>';
    const Page = execute(
      doc,
      { components: { Nesting, WithChildren: Nesting } },
      { components: { Nesting } },
    ) as RMDXModule['default'];
    render(<Page />);

    expect(screen.getByText('Hello, Test User!')).toBeVisible();
  });

  it('renders the default export of a custom component and passes through props', () => {
    const Test = run(compile('{props.attr}')) as RMDXModule;
    const doc = '<Test attr="Hello" />';
    const Page = run(compile(doc, { components: { Test: '' } }), { components: { Test } });
    render(<Page.default />);

    expect(screen.getByText('Hello')).toBeVisible();
  });
});
