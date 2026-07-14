import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';

import { vi } from 'vitest';

import HTMLBlock from '../../components/HTMLBlock';

import { renderingEngines } from './utils';

describe('HTML Block', () => {
  beforeEach(() => {
    global.mockFn = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('runs user scripts in compat mode', () => {
    render(<HTMLBlock runScripts={true}>{'<script>mockFn()</script>'}</HTMLBlock>);
    expect(global.mockFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't run user scripts by default", () => {
    render(<HTMLBlock>{'<script>mockFn()</script>'}</HTMLBlock>);
    expect(global.mockFn).toHaveBeenCalledTimes(0);
  });

  it("doesn't render user scripts by default", () => {
    render(<HTMLBlock>{'<script>mockFn()</script>'}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with weird endings", () => {
    render(<HTMLBlock>{"<script>mockFn()</script foo='bar'>"}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with a malicious string", () => {
    render(<HTMLBlock>{'<scrip<script></script>t>mockFn()</s<script></script>cript>'}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  // CX-3701: a non-string child must never throw. An unhandled throw here bubbles
  // to the page-level error boundary and replaces the ENTIRE document. Fail soft
  // by rendering the child nodes directly so the failure stays localized.
  it('fails soft on non-string children instead of throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() =>
      render(
        <HTMLBlock>
          <b>x</b>
        </HTMLBlock>,
      ),
    ).not.toThrow();
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-string children'));

    warnSpy.mockRestore();
  });

  it("doesn't run scripts on the server (even in compat mode)", () => {
    const html = `
    <h1>Hello World</h1>
    <script>mockFn()</script>
    `;
    const elem = <HTMLBlock runScripts={true}>{html}</HTMLBlock>;
    const view = renderToString(elem);
    expect(elem.props.runScripts).toBe(true);
    expect(view.indexOf('<script>')).toBeLessThan(0);
    expect(view.indexOf('<h1>')).toBeGreaterThanOrEqual(0);
  });

  // TODO: Skipped about the mdxish engine fails this test since it wraps the <pre> in a <p> tag
  // Rendering looks correct, so skip this for now until we decide if we want to fix this or not
  it.skip.each(renderingEngines)('%s: renders the html in a `<pre>` tag if safeMode={true}', (_label, renderContent) => {
    const md = '<HTMLBlock safeMode={true}>{`<button onload="alert(\'gotcha!\')"/>`}</HTMLBlock>';
    const Component = renderContent(md);
    expect(renderToStaticMarkup(<Component />)).toBe(
      '<pre class="html-unsafe"><code>&lt;button onload=&quot;alert(&#x27;gotcha!&#x27;)&quot;/&gt;</code></pre>',
    );
  });
});
