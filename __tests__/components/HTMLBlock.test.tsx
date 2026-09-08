import '@testing-library/jest-dom';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';

import { vi, type Mock } from 'vitest';

import HTMLBlock from '../../components/HTMLBlock';

import { renderingEngines } from './utils';

const g = globalThis as typeof globalThis & { mockFn: Mock };

describe('HTML Block', () => {
  beforeEach(() => {
    g.mockFn = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('runs user scripts in compat mode', () => {
    render(<HTMLBlock runScripts={true}>{'<script>mockFn()</script>'}</HTMLBlock>);
    expect(g.mockFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't run user scripts by default", () => {
    render(<HTMLBlock>{'<script>mockFn()</script>'}</HTMLBlock>);
    expect(g.mockFn).toHaveBeenCalledTimes(0);
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

  // A non-string child must never throw can appear if the user does not enclose
  // the block content with the {`...`} template literal, so it'll behave like
  // normal component block
  // When that happens we just want to fail softly and render the child nodes directly
  // instead of throwing an error
  it('fails soft on non-string children instead of throwing', () => {
    expect(() =>
      render(
        <HTMLBlock>
          <b>x</b>
        </HTMLBlock>,
      ),
    ).not.toThrow();
    expect(screen.getByText('x')).toBeInTheDocument();
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

  it.each(renderingEngines)('%s: renders the html in a `<pre>` tag if safeMode={true}', (_label, renderContent) => {
    const md = '<HTMLBlock safeMode={true}>{`<button onload="alert(\'gotcha!\')"/>`}</HTMLBlock>';
    const Component = renderContent(md);
    expect(renderToStaticMarkup(<Component />)).toBe(
      '<pre class="html-unsafe"><code>&lt;button onload=&quot;alert(&#x27;gotcha!&#x27;)&quot;/&gt;</code></pre>',
    );
  });
});
