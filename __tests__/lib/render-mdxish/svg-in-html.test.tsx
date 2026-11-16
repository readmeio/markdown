import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

// Inline SVGs authored inside HTML wrappers / custom components must keep their
// graphic children (<path>, <rect>, <circle>, …) — which are neither HTML tags
// nor components — and must not fragment into code blocks when their children are
// separated by blank lines. See the SVG regression around #1545.
const renderToDom = (md: string) => {
  const Content = renderMdxish(mdxish(md)).default;
  return render(<Content />);
};

describe('inline SVGs in mdxish', () => {
  it('keeps svg children inside a plain HTML wrapper', () => {
    const { container } = renderToDom(`<div class="icon">
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" />

    <path d="M9 9h6v6H9z" />
  </svg>
</div>`);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('rect')).toBeInTheDocument();
    expect(svg?.querySelectorAll('path')).toHaveLength(1);
  });

  it('keeps svg children in a deeply nested card without fragmenting into a code block', () => {
    const { container } = renderToDom(`<div class="cards-grid">
  <a href="/docs/x" class="nav-card">
    <div class="card-icon">
      <svg width="22" height="22" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" rx="2" />

        <path d="M9 9h6v6H9z" />

        <path d="M9 1v3" />
      </svg>
    </div>

    <div class="card-title">MCP server</div>
  </a>
</div>`);

    expect(container.querySelector('pre')).not.toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('rect')).toBeInTheDocument();
    expect(svg?.querySelectorAll('path')).toHaveLength(2);
    expect(container.textContent).toContain('MCP server');
  });

  it('keeps svg children inside a custom component body', () => {
    const { container } = renderToDom(`<Columns>
  <Column>
    <div class="feature-icon">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />

        <line x1="2" y1="12" x2="22" y2="12" />

        <path d="M12 2a15.3 15.3 0 0 1 4 10z" />
      </svg>
    </div>

    **Scale globally**

    Deploy to users worldwide.
  </Column>
</Columns>`);

    expect(container.querySelector('pre')).not.toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg?.querySelector('circle')).toBeInTheDocument();
    expect(svg?.querySelector('line')).toBeInTheDocument();
    expect(svg?.querySelectorAll('path')).toHaveLength(1);
    expect(container.querySelector('strong')?.textContent).toBe('Scale globally');
  });

  it('keeps MathML children inside an HTML wrapper', () => {
    const { container } = renderToDom(`<div class="equation">
  <math>
    <mrow>
      <mi>x</mi>

      <mo>=</mo>

      <mn>1</mn>
    </mrow>
  </math>
</div>`);

    // NB: jsdom types MathML nodes as generic Element (not HTMLElement), so
    // jest-dom's toBeInTheDocument() rejects them — assert on null/content instead.
    expect(container.querySelector('pre')).toBeNull();
    const math = container.querySelector('math');
    expect(math).not.toBeNull();
    expect(math?.querySelector('mrow')).not.toBeNull();
    expect(math?.querySelectorAll('mi')).toHaveLength(1);
    expect(math?.querySelector('mo')?.textContent).toBe('=');
    expect(math?.textContent?.replace(/\s+/g, '')).toBe('x=1');
  });

  it('renders every svg shape in a multi-card grid', () => {
    const { container } = renderToDom(`<div class="cards-grid">
  <a href="/a" class="nav-card">
    <div class="card-icon">
      <svg viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14" />
      </svg>
    </div>

    <div class="card-title">Guides</div>
  </a>

  <a href="/b" class="nav-card">
    <div class="card-icon">
      <svg viewBox="0 0 24 24">
        <ellipse cx="12" cy="5" rx="9" ry="3" />

        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      </svg>
    </div>

    <div class="card-title">Datahub</div>
  </a>
</div>`);

    expect(container.querySelector('pre')).not.toBeInTheDocument();
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    expect(svgs[0].querySelector('polygon')).toBeInTheDocument();
    expect(svgs[1].querySelector('ellipse')).toBeInTheDocument();
    expect(svgs[1].querySelector('path')).toBeInTheDocument();
    expect(container.textContent).toContain('Guides');
    expect(container.textContent).toContain('Datahub');
  });

  it('keeps paragraphs separate after a multi-line self-closing <svg/>', () => {
    // A self-closing SVG whose `/>` wraps onto its own line must not latch the
    // blank-line collapser and merge the body copy below it into one paragraph.
    const { container } = renderToDom(`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
/>

First paragraph of body copy.

Second paragraph of body copy.`);

    // The corruption signature (#1545) was the two body paragraphs collapsing
    // into a single <p> joined by a soft-break <br>. Assert they stay distinct.
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('br')).not.toBeInTheDocument();

    const paragraphTexts = [...container.querySelectorAll('p')].map(p => p.textContent);
    expect(paragraphTexts).toContain('First paragraph of body copy.');
    expect(paragraphTexts).toContain('Second paragraph of body copy.');
  });
});
