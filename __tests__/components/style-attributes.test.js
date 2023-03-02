import { renderToString } from 'react-dom/server';

import { react } from '../../index';

describe('style attributes', () => {
  describe('safeMode = false', () => {
    it('renders style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(react(md))).toMatchInlineSnapshot(
        '"<div style=\\"background-color:salmon\\" data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });

  describe('safeMode = true', () => {
    it('does not render style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';

      expect(renderToString(react(md, { safeMode: true }))).toMatchInlineSnapshot(
        '"<div data-reactroot=\\"\\">fish content</div>"'
      );
    });
  });
});
