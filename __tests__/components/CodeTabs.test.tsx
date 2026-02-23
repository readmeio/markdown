import { render } from '@testing-library/react';
import React from 'react';

import Code from '../../components/Code';
import CodeTabs from '../../components/CodeTabs';
import { execute } from '../helpers';

describe('CodeTabs', () => {
  describe('mdxish', () => {
    it.todo('should render through the mdxish pipeline');
  });

  describe('mdx', () => {
    it.skip('render _all_ its children', () => {
      const md = `
\`\`\`
assert('theme', 'dark');
\`\`\`
\`\`\`
assert('theme', 'light');
\`\`\`
    `;
      const Component = execute(md);
      const { container } = render(<Component />);

      expect(container).toHaveTextContent("assert('theme', 'dark')");
      expect(container).toHaveTextContent("assert('theme', 'light')");
    });
  });

  describe('render', () => {
    it('renders the CodeTabs wrapper', () => {
      const { container } = render(
        <CodeTabs>
          <pre><Code lang="js">{'console.log("hello");'}</Code></pre>
        </CodeTabs>,
      );
      expect(container.querySelector('.CodeTabs')).toBeInTheDocument();
    });

    it('renders toolbar buttons for each tab', () => {
      const { container } = render(
        <CodeTabs>
          <pre><Code lang="js">{'const a = 1;'}</Code></pre>
          <pre><Code lang="py">{'a = 1'}</Code></pre>
        </CodeTabs>,
      );
      const buttons = container.querySelectorAll('.CodeTabs-toolbar button');
      expect(buttons).toHaveLength(2);
    });

    it('renders code content in CodeTabs-inner', () => {
      const { container } = render(
        <CodeTabs>
          <pre><Code lang="js">{'const a = 1;'}</Code></pre>
        </CodeTabs>,
      );
      expect(container.querySelector('.CodeTabs-inner')).toBeInTheDocument();
      expect(container).toHaveTextContent('const a = 1;');
    });
  });
});
