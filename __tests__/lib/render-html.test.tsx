import { render, screen } from '@testing-library/react';
import React from 'react';

import { mix } from '../../index';
import renderHtml from '../../lib/render-html';

describe('renderHtml', () => {
  it('renders simple HTML content', () => {
    const html = '<h1>Hello, world!</h1><p>This is a test paragraph.</p>';
    const mod = renderHtml(html);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.getByText('This is a test paragraph.')).toBeInTheDocument();
  });

  it('renders HTML from mix output', async () => {
    const md = '### Hello, world!\n\nThis is **markdown** content.';
    const html = await mix(md);
    const mod = renderHtml(html);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    // Text is split across nodes, so use a more flexible matcher
    expect(screen.getByText(/This is/)).toBeInTheDocument();
    expect(screen.getByText('markdown')).toBeInTheDocument();
    expect(screen.getByText(/content\./)).toBeInTheDocument();
  });

  it('extracts TOC from headings', () => {
    const html = '<h1>First Heading</h1><p>Content</p><h2>Second Heading</h2><hr>';
    const mod = renderHtml(html);

    expect(mod.toc).toBeDefined();
    expect(mod.toc).toHaveLength(2);
    expect(mod.Toc).toBeDefined();
  });
});

