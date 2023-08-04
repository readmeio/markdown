import { react } from '../../index';

const { render, screen } = require('@testing-library/react');

describe('react()', () => {
  describe('code-tabs', () => {
    // @todo: @mdx-js/runtime isn't being loaded correctly?!?
    it.skip('should render code-tabs with { mdx: true }', () => {
      const md = `
\`\`\`js First
one
\`\`\`
\`\`\`js Second
two
\`\`\`
      `;

      render(react(md, { mdx: true }));

      expect(screen).toHaveTextContent('First');
    });
  });
});
