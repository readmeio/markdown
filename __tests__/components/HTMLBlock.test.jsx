import { render, screen } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { vi } from 'vitest';

import createHTMLBlock from '../../components/HTMLBlock';
import { compile, run } from '../../index';
import createSchema from '../../sanitize.schema';

const HTMLBlock = createHTMLBlock(createSchema(), {});

describe.skip('HTML Block', () => {
  beforeEach(() => {
    global.window = true;
    global.mockFn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs user scripts in compat mode', () => {
    render(<HTMLBlock html="<script>mockFn()</script>" runScripts={true} />);
    expect(global.mockFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't run user scripts by default", () => {
    render(<HTMLBlock html="<script>mockFn()</script>" runScripts={false} />);
    expect(global.mockFn).toHaveBeenCalledTimes(0);
  });

  it("doesn't render user scripts by default", () => {
    render(<HTMLBlock html="<script>mockFn()</script>" runScripts={false} />);

    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with weird endings", () => {
    render(<HTMLBlock html="<script>mockFn()</script foo='bar'>" runScripts={false} />);

    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't render user scripts with a malicious string", () => {
    render(<HTMLBlock html="<scrip<script></script>t>mockFn()</s<script></script>cript>" runScripts={false} />);

    expect(screen.queryByText('mockFn()')).not.toBeInTheDocument();
  });

  it("doesn't run scripts on the server (even in compat mode)", () => {
    const html = `
    <h1>Hello World</h1>
    <script>mockFn()</script>
    `;
    const elem = <HTMLBlock html={html} runScripts={true} />;
    const view = renderToString(elem);
    expect(elem.props.runScripts).toBe(true);
    expect(view.indexOf('<script>')).toBeLessThan(0);
    expect(view.indexOf('<h1>')).toBeGreaterThanOrEqual(0);
  });

  it('renders the html in a `<pre>` tag if safeMode={true}', () => {
    const md = `
[block:html]
${JSON.stringify({
  html: '<button onload="alert(\'gotcha!\')"/>',
})}
[/block]
    `;

    expect(renderToString(run(compile(md, { safeMode: true })))).toMatchInlineSnapshot(
      '"<pre class=\\"html-unsafe\\" data-reactroot=\\"\\"><code>&lt;button onload=&quot;alert(&#39;gotcha!&#39;)&quot;/&gt;</code></pre>"'
    );
  });
});
