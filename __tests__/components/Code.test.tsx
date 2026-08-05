import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Code from '../../components/Code';

import { captureMdxishProps, renderingEngines } from './utils';

describe('Code', () => {
  describe('general component rendering', () => {
    it('renders a code element', () => {
      const { container } = render(<Code>{'console.log("hi");'}</Code>);
      expect(container.querySelector('code.rdmd-code')).toBeInTheDocument();
    });

    it('renders children as code content', () => {
      const { container } = render(<Code>{'console.log("hi");'}</Code>);
      expect(container).toHaveTextContent('console.log("hi");');
    });

    it('handles undefined children', () => {
      const { container } = render(<Code />);
      expect(container).toHaveTextContent('');
    });
  });

  it.each(renderingEngines)('%s: renders a fenced code block', (_label, renderContent) => {
    const md = `\`\`\`js
const x = 1;
\`\`\``;
    const Content = renderContent(md);
    const { container } = render(<Content />);
    expect(container.querySelector('code')).toBeInTheDocument();
    expect(container.textContent).toContain('const x = 1;');
  });

  it.each(renderingEngines)('%s: renders inline code', (_label, renderContent) => {
    const md = 'Use `console.log()` to debug';
    const Content = renderContent(md);
    const { container } = render(<Content />);
    expect(container.querySelector('code')).toBeInTheDocument();
    expect(container.textContent).toContain('console.log()');
  });

  it('mdxish: inline <code style="..."> renders without crashing and receives style as an object', () => {
    const md = 'Use <code style="color: red">console.log()</code> to debug';
    const [, renderMdxishContent] = renderingEngines.find(([label]) => label === 'mdxish')!;
    const Content = renderMdxishContent(md);

    expect(() => render(<Content />)).not.toThrow();

    const captured = captureMdxishProps(md, 'code');
    expect(typeof captured.style).toBe('object');
    expect(captured.style).toMatchObject({ color: 'red' });
  });
});
