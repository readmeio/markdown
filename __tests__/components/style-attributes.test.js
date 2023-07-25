const { renderToString } = require('react-dom/server');

const { react } = require('../../index');

describe('style attributes', () => {
  describe('safeMode = false', () => {
    it('renders style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(react(md))).toMatchInlineSnapshot(
        '"<div theme=\\"light\\" style=\\"background-color:salmon\\" data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });

  describe('safeMode = true', () => {
    it('does not render style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(react(md, { safeMode: true }))).toMatchInlineSnapshot(
        '"<div theme=\\"light\\" data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });
});
