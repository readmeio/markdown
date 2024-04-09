const { render } = require('@testing-library/react');

const { react } = require('../../index');

describe('Style tag', () => {
  describe('safeMode = false', () => {
    it('renders as a style tag', () => {
      const md = '<style>{ background-color: salmon }</style>';
      const { container } = render(react(md));

      expect(container.querySelector('style').innerHTML).toBe('{ background-color: salmon }');
    });
  });

  describe('safeMode = true', () => {
    it('renders the style in a `<pre>`', () => {
      const md = '<style>{ background-color: salmon }</style>';
      const { container } = render(react(md, { safeMode: true }));

      expect(container.querySelector('pre > code').innerHTML).toBe(
        '&lt;style&gt;\n{ background-color: salmon }\n&lt;/style&gt;',
      );
    });

    it('renders the style in a `<pre>` when attrs are present', () => {
      const md = '<style someAttr="muahaha">{ background-color: salmon }</style>';
      const { container } = render(react(md, { safeMode: true }));

      expect(container.querySelector('pre > code').innerHTML).toBe(
        '&lt;style&gt;\n{ background-color: salmon }\n&lt;/style&gt;',
      );
    });
  });
});
