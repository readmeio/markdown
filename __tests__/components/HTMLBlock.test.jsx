const { mount } = require('enzyme');
const React = require('react');
const { renderToString } = require('react-dom/server');

const sanitize = require('../../sanitize.schema');
const HTMLBlock = require('../../components/HTMLBlock')(sanitize);

describe('HTML Block', () => {
  beforeEach(() => {
    global.window = true;
    global.mockFn = jest.fn(() => console.log('RAN CUSTOM SCRIPT'));
  });

  it('runs user scripts in compat mode', () => {
    mount(<HTMLBlock html="<script>mockFn()</script>" runScripts={true} />);
    expect(global.mockFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't run user scripts by default", () => {
    mount(<HTMLBlock html="<script>mockFn()</script>" runScripts={false} />);
    expect(global.mockFn).toHaveBeenCalledTimes(0);
  });

  it("doesn't run scripts on the server (even in compat mode)", () => {
    const html = `
    <h1>Hello World</h1>
    <script>mockFn()</script>
    `;
    const elem = <HTMLBlock html={html} runScripts={true} />;
    const ssr = renderToString(elem);
    expect(elem.props.runScripts).toBe(true);
    expect(ssr.indexOf('<script>')).toBeLessThan(0);
    expect(ssr.indexOf('<h1>')).toBeGreaterThanOrEqual(0);
  });
});
