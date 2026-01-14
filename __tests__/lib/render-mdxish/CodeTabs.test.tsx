import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';
import { execute } from '../../helpers';

describe('code tabs renderer', () => {
  describe('given 2 consecutive code blocks', () => {
    const cppCode = `#include <iostream>

int main(void) {
	std::cout << "hello world";
	return 0;
}`;
    const pythonCode = 'print("hello world")';

    const md = `
\`\`\`cplusplus
${cppCode}
\`\`\`
\`\`\`python
${pythonCode}
\`\`\`
`;
    const mod = renderMdxish(mdxish(md));

    it('should not error when rendering', () => {
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it('should combine the 2 code blocks into a code-tabs block', () => {
      const { container } = render(<mod.default />);

      // Should have a div with class CodeTabs
      expect(container.querySelector('div.CodeTabs')).toBeInTheDocument();

      // Verify both codes are in the DOM (C++ is visible, Python tab is hidden but present)
      // Using textContent to handle cases where syntax highlighting splits text across nodes
      expect(container.textContent).toContain('#include <iostream>');
      expect(container.textContent).toContain('std::cout << "hello world"');
      expect(container.textContent).toContain(pythonCode);
    });

    it('should render the buttons with the correct text', () => {
      const { container } = render(<mod.default />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('C++');
      expect(buttons[1]).toHaveTextContent('Python');
    });
  });

  describe('given a mermaid diagram', () => {
    const mermaidCode = 'graph TD\nA[Start] --> B[Stop]';

    it('should render a single mermaid diagram', () => {
      const md = `
\`\`\`mermaid
${mermaidCode}
\`\`\`
      `;

      const mdxishHast = mdxish(md);
      const mod = renderMdxish(mdxishHast);
      const { container } = render(<mod.default />);

      // The mermaid-render class is used to identify the mermaid diagrams elements for the
      // mermaid library to transform. See components/CodeTabs/index.tsx for context
      expect(container.querySelector('pre.mermaid-render')).toBeInTheDocument();
      expect(container.querySelector('div.CodeTabs')).not.toBeInTheDocument();
      expect(container.querySelector('pre.mermaid-render')?.textContent).toBe(mermaidCode);

      // REGRESSION TEST: should render single mermaid diagram with old execute function
      const Component = execute(md, {}, {});
      const { container: mdxContainer } = render(<Component />);

      expect(mdxContainer.querySelector('pre.mermaid-render')).toBeInTheDocument();
      expect(mdxContainer.querySelector('div.CodeTabs')).not.toBeInTheDocument();
      expect(mdxContainer.querySelector('pre.mermaid-render')?.textContent).toBe(mermaidCode);
    });

    it('should render tabbed mermaid diagrams', () => {
      const md = `
\`\`\`mermaid
${mermaidCode}
\`\`\`
\`\`\`mermaid
${mermaidCode}
\`\`\`
      `;
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);
      // Should still be tabbed
      expect(container.querySelector('div.CodeTabs')).toBeInTheDocument();
      expect(container.querySelectorAll('pre.mermaid-render')).toHaveLength(2);

      // REGRESSION TEST: should render tabbed mermaid diagrams with old execute function
      const Component = execute(md, {}, {});
      const { container: mdxContainer } = render(<Component />);

      expect(mdxContainer.querySelector('div.CodeTabs')).toBeInTheDocument();
      expect(mdxContainer.querySelectorAll('pre.mermaid-render')).toHaveLength(2);
    });
  });
});
