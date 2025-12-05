import type { RMDXModule } from '../../types';
import type { MDXProps } from 'mdx/types';

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { mdxish } from '../../index';
import renderMdxish from '../../lib/renderMdxish';

describe('renderMdxish', () => {
  it('renders simple HTML content', () => {
    const input = '<h1>Hello, world!</h1><p>This is a test paragraph.</p>';
    const tree = mdxish(input);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.getByText('This is a test paragraph.')).toBeInTheDocument();
  });

  it('renders HTML from mix output', () => {
    const md = '### Hello, world!\n\nThis is **markdown** content.';
    const tree = mdxish(md);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    // Text is split across nodes, so use a more flexible matcher
    expect(screen.getByText(/This is/)).toBeInTheDocument();
    expect(screen.getByText('markdown')).toBeInTheDocument();
    expect(screen.getByText(/content\./)).toBeInTheDocument();
  });

  it('rehydrates custom components from mix output when preserveComponents is true', () => {
    const md = `<Callout theme="warn" icon="🚧">

**Heads up!**

This is a custom component.
</Callout>`;

    const tree = mdxish(md);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);
    expect(container.querySelector('.callout.callout_warn')).toBeInTheDocument();
    expect(screen.getByText('Heads up!')).toBeInTheDocument();
    expect(screen.getByText('This is a custom component.')).toBeInTheDocument();
  });

  it('keeps content after a custom component outside of the component', () => {
    const md = `<MyComponent>

  This is a component with a space in the content.
</MyComponent>

This should be outside`;

    const components: Record<string, RMDXModule> = {
      MyComponent: {
        default: (props: MDXProps) => <div data-testid="my-component">{props.children as React.ReactNode}</div>,
        Toc: () => null,
        toc: [],
        stylesheet: undefined,
      },
    };

    const tree = mdxish(md, { components });
    const mod = renderMdxish(tree, { components });

    render(<mod.default />);

    const wrapper = screen.getByTestId('my-component');
    expect(wrapper.querySelectorAll('p')).toHaveLength(1);
    expect(screen.getByText('This is a component with a space in the content.')).toBeInTheDocument();
    expect(screen.getByText('This should be outside')).toBeInTheDocument();
    expect(wrapper).not.toContainElement(screen.getByText('This should be outside'));
  });

  it('keeps following content outside of self-closing components', () => {
    const md = `<MyComponent />

Hello`;

    const components = {
      MyComponent: {
        default: () => <div data-testid="my-component" />,
        Toc: null,
        toc: [],
      },
    };

    const tree = mdxish(md, { components });
    const mod = renderMdxish(tree, { components });

    render(<mod.default />);

    const wrapper = screen.getByTestId('my-component');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toBeEmptyDOMElement();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(wrapper).not.toContainElement(screen.getByText('Hello'));
  });

  it('renders HTMLBlock with renderMdxish', () => {
    const markdown = '<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>';

    const tree = mdxish(markdown);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    const htmlBlock = document.querySelector('.rdmd-html');
    expect(htmlBlock).toBeInTheDocument();
    expect(htmlBlock?.innerHTML).toContain('Hello');
    expect(htmlBlock?.innerHTML).toContain('World!');
    expect(htmlBlock?.innerHTML).toContain('<p>');
    expect(htmlBlock?.innerHTML).not.toContain('{');
  });
});
