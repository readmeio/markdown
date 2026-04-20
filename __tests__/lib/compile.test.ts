import { render } from '@testing-library/react';
import React from 'react';

import { compile, run } from '../../index';

const renderMarkdown = (doc: string) => {
  const code = compile(doc, { format: 'md' });
  const mod = run(code, { format: 'md' });
  const { container } = render(React.createElement(mod.default));
  return container.querySelector('a');
};

describe('compile', () => {
  describe("{ format: 'md' }", () => {
    it('returns plain text of markdown components', () => {
      const md = '[link to doc](doc:getting-started)';

      const tree = compile(md, { format: 'md' });
      expect(tree).toMatch(/href: "doc:getting-started"/);
    });

    it('preserves target on raw HTML anchors', () => {
      const anchor = renderMarkdown('<a href="https://example.com" target="_blank">test</a>');

      expect(anchor).toHaveAttribute('href', 'https://example.com');
      expect(anchor).toHaveAttribute('target', '_blank');
    });

    it('preserves internal reference protocols on raw HTML anchors', () => {
      const anchor = renderMarkdown('<a href="ref:getting-started" target="_blank">test</a>');

      expect(anchor).toHaveAttribute('href', 'ref:getting-started');
      expect(anchor).toHaveAttribute('target', '_blank');
    });

    it('sanitizes unsafe protocols on raw HTML anchors', () => {
      const anchor = renderMarkdown('<a href="javascript:alert(1)">test</a>');

      expect(anchor).not.toHaveAttribute('href', 'javascript:alert(1)');
    });
  });
});
