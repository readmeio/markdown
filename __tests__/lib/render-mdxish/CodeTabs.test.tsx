import '@testing-library/jest-dom';
import { render, prettyDOM } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

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
});
