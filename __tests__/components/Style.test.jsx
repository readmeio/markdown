const { renderToString } = require('react-dom/server');

const { react } = require('../../index');

describe('Style tag', () => {
  describe('safeMode = false', () => {
    it('renders as a style tag', () => {
      const md = '<style>{ background-color: salmon }</style>';

      expect(renderToString(react(md))).toMatchInlineSnapshot(
        '"<style data-reactroot=\\"\\">{ background-color: salmon }</style>"',
      );
    });
  });

  describe('safeMode = true', () => {
    it('renders the style in a `<pre>`', () => {
      const md = '<style>{ background-color: salmon }</style>';

      expect(renderToString(react(md, { safeMode: true }))).toMatchInlineSnapshot(`
        "<pre data-reactroot=\\"\\"><code>&lt;style&gt;
        { background-color: salmon }
        &lt;/style&gt;</code></pre>"
      `);
    });

    it('renders the style in a `<pre>` when attrs are present', () => {
      const md = '<style someAttr="muahaha">{ background-color: salmon }</style>';

      expect(renderToString(react(md, { safeMode: true }))).toMatchInlineSnapshot(`
        "<pre data-reactroot=\\"\\"><code>&lt;style&gt;
        { background-color: salmon }
        &lt;/style&gt;</code></pre>"
      `);
    });
  });
});
