import { render } from '@testing-library/react';
import React from 'react';

import { execute } from '../helpers';

/**
 * The `md` format sanitizes via rehype-sanitize (covered in run.test.tsx). Default
 * MDX format keeps raw HTML as JSX nodes that schema never sees, so these assert the
 * shared dangerous-HTML stripper closes that path too.
 */
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

    // The link text still renders, but no anchor carries a javascript: href.
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    // eslint-disable-next-line no-script-url
    expect(hrefs.some(href => href?.startsWith('javascript:'))).toBe(false);
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
