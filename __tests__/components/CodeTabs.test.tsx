import { render } from '@testing-library/react';
import React from 'react';

import { renderingEngines } from './utils';

describe('CodeTabs', () => {
  it.each(renderingEngines)('%s: render _all_ its children', (_label, renderContent) => {
    const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
\`\`\`
assert('theme', 'light');
\`\`\`
    `;
    const Component = renderContent(md);
    const { container } = render(<Component />);

    expect(container).toHaveTextContent("assert('theme', 'dark')");
    expect(container).toHaveTextContent("assert('theme', 'light')");
  });
});
