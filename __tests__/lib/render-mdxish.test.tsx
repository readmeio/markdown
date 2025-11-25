import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { mdxish } from '../../index';
import renderMdxish from '../../lib/render-mdxish';

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

  it('extracts TOC from headings', () => {
    const text = '<h1>First Heading</h1><p>Content</p><h2>Second Heading</h2><hr>';
    const tree = mdxish(text);
    const mod = renderMdxish(tree);

    expect(mod.toc).toBeDefined();
    expect(mod.toc).toHaveLength(2);
    expect(mod.Toc).toBeDefined();
  });
});
