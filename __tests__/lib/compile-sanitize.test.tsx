import { render } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

// `md` format sanitizes via rehype-sanitize's allow-list (covered in run.test.tsx).
// Default MDX keeps raw HTML as JSX nodes that allow-list never sees, so these assert
// the deny-list stripper removes the known script-execution vectors on that path.
describe('MDX (compile) sanitization', () => {
  it('strips script-execution vectors in default MDX format', () => {
    const md = [
      '# Docs',
      '',
      '<script>window.__xss = 1</script>',
      '',
      '<a href="javascript:alert(1)">link</a>',
      '',
      '<img src="x" onerror="window.__xss = 1" />',
      '',
      '<iframe src="javascript:alert(1)"></iframe>',
    ].join('\n');

    const Component = execute(md, {}, {}); // no format => MDX
    const { container } = render(<Component />);

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();

    // The link text still renders, but no anchor carries a script-executing href.
    const dangerousScheme = /^\s*(?:javascript|vbscript|data):/i;
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(hrefs.some(href => href !== null && dangerousScheme.test(href))).toBe(false);
    expect(container.textContent).toContain('link');

    // Image still renders, but the onerror handler is gone.
    const image = container.querySelector('img');
    expect(image?.getAttribute('onerror')).toBeNull();
  });

  it('strips the MathML namespace-confusion payload in default MDX format', () => {
    const md = '# Docs\n\n<math><mtext><script>window.__xss = 1</script></mtext></math>';

    const Component = execute(md, {}, {});
    const { container } = render(<Component />);

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('math')).not.toBeInTheDocument();
    expect(container.querySelector('h1')).toBeInTheDocument();
  });
});
