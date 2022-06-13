const { render } = require('@testing-library/react');
const React = require('react');
const { renderToString } = require('react-dom/server');

const sanitize = require('../../sanitize.schema');
const HTMLBlock = require('../../components/HTMLBlock')(sanitize, {});
const { react } = require('../../index');

describe('HTML Block', () => {
  beforeEach(() => {
    global.window = true;
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

  it('renders in the html in a `<pre>` tag if safeMode={true}', () => {
    const md = `
[block:html]
${JSON.stringify({
  html: '<button onload="alert(\'gotcha!\')"/>',
})}
[/block]
    `;

    expect(renderToString(react(md, { safeMode: true }))).toMatchInlineSnapshot(
      `"<pre class=\\"html-unsafe\\" data-reactroot=\\"\\"><code>&lt;button onload=&quot;alert(&#x27;gotcha!&#x27;)&quot;/&gt;</code></pre>"`
    );
  });
});
