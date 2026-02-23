import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('render mdxish variables in code', () => {
  it('resolves legacy and mdx variables in inline code', () => {
    const md = 'Use `<<apiKey>>` and `{user.region}`';
    const variables = {
      user: { apiKey: 'key_live_123', region: 'us-west-2' },
      defaults: [],
    };

    const mod = renderMdxish(mdxish(md, { variables }), { variables });
    const { container } = render(<mod.default />);

    expect(container.textContent).toContain('key_live_123');
    expect(container.textContent).toContain('us-west-2');
    expect(container.textContent).not.toContain('<<apiKey>>');
    expect(container.textContent).not.toContain('{user.region}');
  });

  it('resolves legacy and mdx variables in fenced code blocks', () => {
    const md = `
\`\`\`bash
curl -H "Authorization: Bearer <<apiKey>>" https://api.example.com/{user.region}
\`\`\`
`;
    const variables = {
      user: { apiKey: 'key_prod_abc', region: 'eu-central-1' },
      defaults: [],
    };

    const mod = renderMdxish(mdxish(md, { variables }), { variables });
    const { container } = render(<mod.default />);

    expect(container.textContent).toContain('Bearer key_prod_abc');
    expect(container.textContent).toContain('https://api.example.com/eu-central-1');
    expect(container.textContent).not.toContain('<<apiKey>>');
    expect(container.textContent).not.toContain('{user.region}');
  });
});
