import { compile, run } from '../../index';
import { renderToString } from 'react-dom/server';
import React from 'react';

describe('Custom Components', () => {
  const Example = () => <div>It works!</div>;
  const Composite = () => (
    <>
      <div>Does it work?</div>
      <Example />
    </>
  );

  it('renders custom components', () => {
    const doc = `
<Example />
    `;
    const Page = run(compile(doc), { components: { Example } });
    const output = renderToString(<Page />);

    expect(output).toBe('<div data-reactroot="">It works!</div>');
  });

  it('renders custom components recursively', () => {
    const doc = `
<Composite />
    `;

    const Page = run(compile(doc), { components: { Example, Composite } });
    const output = renderToString(<Page />);

    expect(output).toBe('<div>Does it work?</div><div>It works!</div>');
  });
});
