const { render } = require('@testing-library/react');

const { react } = require('../../index');

describe('style attributes', () => {
  describe('safeMode = false', () => {
    it('renders style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';
      const { container } = render(react(md));

      expect(container.querySelector('[style]')).toBeVisible();
    });
  });

  describe('safeMode = true', () => {
    it('does not render style attributes', () => {
      const md = '<div style="background-color: salmon">fish content</div>';
      const { container } = render(react(md, { safeMode: true }));

      expect(container.querySelector('[style]')).toBeNull();
    });
  });
});
