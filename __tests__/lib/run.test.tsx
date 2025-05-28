import { render, screen } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

describe('run', () => {
  it('allows providing imports', () => {
    const mdx = 'Hello, world!';
    const Component = execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('merges the imports with the built-ins', () => {
    const mdx = '{user.test}';
    const Component = execute(mdx, {}, { imports: { React } });

    render(<Component />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('renders null for a non-existant component', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;
    const Component = execute(mdx, {}, {});

    render(<Component />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders null for a non-existant component when `missingComponents === "ignore"`', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;
    const Component = execute(mdx, { missingComponents: 'ignore' }, {});

    render(<Component />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('throws an error when a component does not exist and `missingComponents === "throw"`', () => {
    const mdx = `
### Hello, world!

<NonExistentComponent />`;

    let error;
    try {
      execute(mdx, { missingComponents: 'throw' }, {});
    } catch (e) {
      error = e;
    }
    expect(error.message).toBe(
      'Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it.',
    );
  });

  it('supports rendering plain markdown', () => {
    const md = `
### Hello, world!
This is plain markdown and mdx expressions such as {1 + 1} will not evaluate.
`;
    const Component = execute(md, { format: 'md' }, {});

    render(<Component />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(
      screen.getByText('This is plain markdown and mdx expressions such as {1 + 1} will not evaluate.'),
    ).toBeInTheDocument();
  });

  it('sanitizes HTML when rendering plain markdown', () => {
    const md = `
<strong>I am safe html</strong>
<pre><code data-testid="code">console.log('I am just a string');</code></pre>
<img src="https://example.com/image.jpg" alt="I am an image" />
<a href="https://example.com">I am a link</a>

<script>alert('I am unsafe HTML');</script>
<style>I am unsafe styles</style>
<iframe src="https://example.com" title="I am an unsafe iframe"></iframe>
`;
    const Component = execute(md, { format: 'md' }, {});
    const { container } = render(<Component />);
    screen.debug();
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.querySelector('code')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
    expect(container.querySelector('a')).toBeInTheDocument();
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('style')).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });
});
