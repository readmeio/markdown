import { renderToString } from 'react-dom/server';

import { compile, run } from '../../index';

describe.skip('style attributes', () => {
  describe('safeMode = false', () => {
    it('renders style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(run(compile(md)))).toMatchInlineSnapshot(
        '"<div style=\\"background-color:salmon\\" data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });

  describe('safeMode = true', () => {
    it('does not render style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(run(compile(md, { safeMode: true })))).toMatchInlineSnapshot(
        '"<div data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });
});
