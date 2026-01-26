import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('Callouts', () => {
  it('renders a > callout with no title with no empty blank heading', () => {
    const md = `
> 🚧
>
> Callout content`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
  });

  it('renders a magic block callout with no title with empty heading and body', () => {
    const md = '[block:callout]{"type":"info","body":"This is important"}[/block]';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
    expect(container.textContent).toContain('This is important');
  });

  it('renders a magic block callout with empty string title and body', () => {
    const md = '[block:callout]{"type":"info","title":"","body":"This callout has an empty title."}[/block]';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).toBeInTheDocument();
    // Body should still render
    expect(container.textContent).toContain('This callout has an empty title.');
  });

  it('renders a magic block callout with title correctly', () => {
    const md =
      '[block:callout]{"type":"info","title":"Information","body":"This is an informational callout."}[/block]';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).not.toBeInTheDocument();

    expect(container.querySelector('h3')).toBeInTheDocument();
    expect(container.textContent).toContain('Information');
    expect(container.textContent).toContain('This is an informational callout.');
  });

  it('renders a magic block callout with markdown in title correctly', () => {
    const md = `[block:callout]
{
  "type": "info",
  "title": "*Italic Title* with **Bold** text",
  "body": "The title contains markdown formatting."
}
[/block]`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).not.toBeInTheDocument();

    expect(container.querySelector('h3')).toBeInTheDocument();
    expect(container.textContent).toContain('Italic Title');
    expect(container.textContent).toContain('Bold');

    expect(container.querySelector('h3 em')).toBeInTheDocument();
    expect(container.querySelector('h3 strong')).toBeInTheDocument();
  });

  it('renders a magic block callout with title only (no body) without empty paragraph', () => {
    const md = '[block:callout]{"type":"info","title":"Title Only Callout"}[/block]';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout-heading.empty')).not.toBeInTheDocument();
    expect(container.querySelector('h3')).toBeInTheDocument();
    expect(container.textContent).toContain('Title Only Callout');

    // Should NOT have an empty paragraph after the title
    const blockquote = container.querySelector('blockquote');
    const paragraphs = blockquote?.querySelectorAll('p');
    expect(paragraphs?.length || 0).toBe(0);
  });

  it('renders an empty blockquote as visible ">" text', () => {
    const md = '>';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).not.toBeInTheDocument();
    expect(container.textContent).toContain('>');
  });

  it('renders a regular blockquote without emoji as a blockquote element', () => {
    const md = '> Hello world';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).toBeInTheDocument();
    expect(container.querySelector('.callout')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Hello world');
  });

  it('renders a callout with emoji icon correctly', () => {
    const md = '> 📘 Info callout';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('.callout.callout_info')).toBeInTheDocument();
    expect(container.textContent).toContain('Info callout');
  });

  it('renders a blockquote with heading inside correctly', () => {
    const md = `> ### Heading inside blockquote
>
> Some content`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).toBeInTheDocument();
    expect(container.querySelector('blockquote h3')).toBeInTheDocument();
    expect(container.textContent).toContain('Heading inside blockquote');
    expect(container.textContent).toContain('Some content');
  });

  it('renders blockquote with multiple headings (like headings.md fixture)', () => {
    const md = `> ### Heading Block 3
>
> #### Heading Block 4
>
> ##### Heading Block 5
>
> ###### Heading Block 6`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).toBeInTheDocument();
    expect(container.querySelector('blockquote h3')).toBeInTheDocument();
    expect(container.querySelector('blockquote h4')).toBeInTheDocument();
    expect(container.querySelector('blockquote h5')).toBeInTheDocument();
    expect(container.querySelector('blockquote h6')).toBeInTheDocument();
    expect(container.textContent).toContain('Heading Block 3');
    expect(container.textContent).toContain('Heading Block 6');
  });

  it('renders blockquote with h1 heading correctly', () => {
    const md = '> # Hello';
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).toBeInTheDocument();
    expect(container.querySelector('blockquote h1')).toBeInTheDocument();
    expect(container.textContent).toContain('Hello');
  });

  it('renders blockquote with list correctly', () => {
    const md = `> * hello
> * from
> * callout`;
    const hast = mdxish(md);
    const mod = renderMdxish(hast);
    const { container } = render(<mod.default />);

    expect(container.querySelector('blockquote')).toBeInTheDocument();
    expect(container.querySelector('blockquote ul')).toBeInTheDocument();
    expect(container.querySelectorAll('blockquote li')).toHaveLength(3);
  });
});
