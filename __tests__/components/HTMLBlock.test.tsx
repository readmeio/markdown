import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { vi } from 'vitest';

import HTMLBlock from '../../components/HTMLBlock';
import { compile, run } from '../../index';

describe('HTML Block', () => {
  beforeEach(() => {
    global.mockFn = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('runs user scripts in compat mode', () => {
    render(<HTMLBlock runScripts={true}>{`<script>mockFn()</script>`}</HTMLBlock>);
    expect(global.mockFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't run user scripts by default", () => {
    render(<HTMLBlock>{`<script>mockFn()</script>`}</HTMLBlock>);
    expect(global.mockFn).toHaveBeenCalledTimes(0);
  });

  it("doesn't render user scripts by default", () => {
    render(<HTMLBlock>{`<script>mockFn()</script>`}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with weird endings", () => {
    render(<HTMLBlock>{`<script>mockFn()</script foo='bar'>`}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with a malicious string", () => {
    render(<HTMLBlock>{`<scrip<script></script>t>mockFn()</s<script></script>cript>`}</HTMLBlock>);
    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
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

  it('renders the html in a `<pre>` tag if safeMode={true}', async () => {
    const md = '<HTMLBlock safeMode={true}>{`<button onload="alert(\'gotcha!\')"/>`}</HTMLBlock>';
    const code = compile(md);
    const Component = await run(code);
    expect(renderToStaticMarkup(<Component />)).toMatchInlineSnapshot(
      '"<pre class="html-unsafe"><code>&lt;button onload=&quot;alert(&#x27;gotcha!&#x27;)&quot;/&gt;</code></pre>"',
    );
  });
});
