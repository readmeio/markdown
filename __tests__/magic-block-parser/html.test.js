import { react } from '../../index';

describe('Html magic block parser', () => {
  it('sanitizes attributes from react components', () => {
    const text = `
[block:html]
${JSON.stringify(
  {
    html: `<style>@keyframes x{}</style><xss style="animation-name:x" onanimationstart="alert(document.cookie)"></xss>`,
  },
  null,
  2
)}
[/block]
    `;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <HTMLBlock
          html="<style>@keyframes x{}</style>"
          runScripts={false}
        />
      </React.Fragment>
    `);
  });

  it('sanitizes tags from react components', () => {
    const text = `
[block:html]
${JSON.stringify(
  {
    html: `<button onclick="alert('oops')">click me!</button>`,
  },
  null,
  2
)}
[/block]
    `;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <HTMLBlock
          html="<p>click me!</p>"
          runScripts={false}
        />
      </React.Fragment>
    `);
  });
});
