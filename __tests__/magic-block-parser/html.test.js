import { react } from '../../index';

describe('Html magic block parser', () => {
  it('sanitizes tags from react components', () => {
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

  it('sanitizes attributes from react components', () => {
    const text = `
[block:html]
${JSON.stringify(
  {
    html: `<div onmouseover="alert('oops')">Uh oh.</div>`,
  },
  null,
  2
)}
[/block]
    `;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <HTMLBlock
          html="<div>Uh oh.</div>"
          runScripts={false}
        />
      </React.Fragment>
    `);
  });

  it('does not allow arbitrary markdown', () => {
    const text = `
[block:html]
${JSON.stringify(
  {
    html: `# not a header`,
  },
  null,
  2
)}
[/block]
    `;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <HTMLBlock
          html="# not a header"
          runScripts={false}
        />
      </React.Fragment>
    `);
  });
});
