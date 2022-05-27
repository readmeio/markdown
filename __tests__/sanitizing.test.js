import { react } from '../index';

describe('Sanitizing Html', () => {
  it('sanitizes tags from react components', () => {
    const text = `<style>@keyframes x{}</style><xss style="animation-name:x" onanimationstart="alert(document.cookie)"></xss>`;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <style>
          @keyframes x{}
        </style>
      </React.Fragment>
    `);
  });

  it('sanitizes attributes from react components', () => {
    const text = `<div onmouseover="alert('oops')">Uh oh.</div>`;

    expect(react(text)).toMatchInlineSnapshot(`
      <React.Fragment>
        <div>
          Uh oh.
        </div>
      </React.Fragment>
    `);
  });
});
