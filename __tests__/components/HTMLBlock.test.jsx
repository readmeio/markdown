import { render, screen } from '@testing-library/react';
import React from 'react';

import createHTMLBlock from '../../components/HTMLBlock';
import { react } from '../../index';
import createSchema from '../../sanitize.schema';

const HTMLBlock = createHTMLBlock(createSchema(), {});

describe('HTML Block', () => {
  beforeEach(() => {
    global.mockFn = jest.fn();
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
    const { container } = render(<HTMLBlock html={html} runScripts={true} />);

    expect(container.querySelector('script')).not.toBeInTheDocument();
  });

  it('renders the html in a `<pre>` tag if safeMode={true}', () => {
    const md = `
[block:html]
${JSON.stringify({
  html: '<button onload="alert(\'gotcha!\')"/>',
})}
[/block]
    `;

    const { container } = render(react(md, { safeMode: true }));

    expect(container.querySelector('pre > code').innerHTML).toBe('&lt;button onload="alert(\'gotcha!\')"/&gt;');
  });
});
