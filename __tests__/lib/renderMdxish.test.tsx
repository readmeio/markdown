import type { RMDXModule } from '../../types';
import type { MDXProps } from 'mdx/types';

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, run } from '../../lib';
import renderMdxish from '../../lib/renderMdxish';

describe('renderMdxish', () => {
  it('renders simple HTML content', () => {
    const input = '<h1>Hello, world!</h1><p>This is a test paragraph.</p>';
    const tree = mdxish(input);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.getByText('This is a test paragraph.')).toBeInTheDocument();
  });

  it('renders HTML from mix output', () => {
    const md = '### Hello, world!\n\nThis is **markdown** content.';
    const tree = mdxish(md);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    // Text is split across nodes, so use a more flexible matcher
    expect(screen.getByText(/This is/)).toBeInTheDocument();
    expect(screen.getByText('markdown')).toBeInTheDocument();
    expect(screen.getByText(/content\./)).toBeInTheDocument();
  });

  it('rehydrates custom components from mix output when preserveComponents is true', () => {
    const md = `<Callout theme="warn" icon="🚧">

**Heads up!**

This is a custom component.
</Callout>`;

    const tree = mdxish(md);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);
    expect(container.querySelector('.callout.callout_warn')).toBeInTheDocument();
    expect(screen.getByText('Heads up!')).toBeInTheDocument();
    expect(screen.getByText('This is a custom component.')).toBeInTheDocument();
  });

  it('keeps content after a custom component outside of the component', () => {
    const md = `<MyComponent>

  This is a component with a space in the content.
</MyComponent>

This should be outside`;

    const components: Record<string, RMDXModule> = {
      MyComponent: {
        default: (props: MDXProps) => <div data-testid="my-component">{props.children as React.ReactNode}</div>,
        Toc: () => null,
        toc: [],
        stylesheet: undefined,
      },
    };

    const tree = mdxish(md, { components });
    const mod = renderMdxish(tree, { components });

    render(<mod.default />);

    const wrapper = screen.getByTestId('my-component');
    expect(wrapper.querySelectorAll('p')).toHaveLength(1);
    expect(screen.getByText('This is a component with a space in the content.')).toBeInTheDocument();
    expect(screen.getByText('This should be outside')).toBeInTheDocument();
    expect(wrapper).not.toContainElement(screen.getByText('This should be outside'));
  });

  it('keeps following content outside of self-closing components', () => {
    const md = `<MyComponent />

Hello`;

    const components = {
      MyComponent: {
        default: () => <div data-testid="my-component" />,
        Toc: null,
        toc: [],
      },
    };

    const tree = mdxish(md, { components });
    const mod = renderMdxish(tree, { components });

    render(<mod.default />);

    const wrapper = screen.getByTestId('my-component');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toBeEmptyDOMElement();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(wrapper).not.toContainElement(screen.getByText('Hello'));
  });

  it('renders HTMLBlock with renderMdxish', () => {
    const markdown = '<HTMLBlock>{`<p><strong">Hello</strong>, World!</p>`}</HTMLBlock>';

    const tree = mdxish(markdown);
    const mod = renderMdxish(tree);

    render(<mod.default />);

    const htmlBlock = document.querySelector('.rdmd-html');
    expect(htmlBlock).toBeInTheDocument();
    expect(htmlBlock?.innerHTML).toContain('Hello');
    expect(htmlBlock?.innerHTML).toContain('World!');
    expect(htmlBlock?.innerHTML).toContain('<p>');
    expect(htmlBlock?.innerHTML).not.toContain('{');
  });

  // CX-3701 (Class 1, hard crash): a multiline <HTMLBlock> whose body contains a
  // <table> used to throw during render and take down the whole page. The block
  // must now render its raw HTML AND leave surrounding content intact.
  it('renders a multiline HTMLBlock containing a styled <table> without crashing the page', () => {
    const markdown = [
      '# Title',
      '',
      '<HTMLBlock>{`',
      '<style> .demo { color: #0062df; } </style>',
      '<table class="demo"><tr><td>hello</td></tr></table>',
      '`}</HTMLBlock>',
      '',
      'after the block',
    ].join('\n');

    const tree = mdxish(markdown);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);

    // The raw table renders inside the html block...
    const htmlBlock = container.querySelector('.rdmd-html');
    expect(htmlBlock?.querySelector('table')).toBeInTheDocument();
    expect(htmlBlock?.innerHTML).toContain('hello');
    // ...and, crucially, the rest of the page survives (no whole-document unmount).
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('after the block')).toBeInTheDocument();
  });

  // CX-3701 (Class 2, soft failure): template-literal <style> must be evaluated to
  // plain CSS, not left as literal `{`...`}` (which the browser drops as invalid).
  it('evaluates a template-literal <style> block into plain CSS', () => {
    const markdown = ['<style>', '  {`', '  .card { border-radius: 22px; }', '  `}', '</style>'].join('\n');

    const tree = mdxish(markdown);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);
    const style = container.querySelector('style');
    expect(style?.innerHTML).toContain('border-radius');
    expect(style?.innerHTML).not.toContain('{`');
  });

  // CX-3701 (Class 3): a raw <table> pretty-printed with blank lines between rows
  // must render as a real table, not collapse into a <pre><code> block.
  it('renders a blank-line-separated raw <table> as a real table', () => {
    const markdown = [
      '<table>',
      '  <thead>',
      '    <tr><th>Country</th></tr>',
      '  </thead>',
      '',
      '  <tr>',
      '    <td>Afghanistan</td>',
      '  </tr>',
      '</table>',
    ].join('\n');

    const tree = mdxish(markdown);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('pre')).not.toBeInTheDocument();
    expect(screen.getByText('Afghanistan')).toBeInTheDocument();
  });

  it('renders a component with an array as a prop', () => {
    const componentWithArrayCode = `
export const CompWithArray = ({ array }) => {
  return (
    <div className="flex justify-center" data-testid="comp-with-array">
      <div className="rounded-md p-6 m-4 max-w-lg border">
        {array.map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </div>
    </div>
  );
};

<CompWithArray array={['a', 'b','c']}/>
          `;
    const compiledComponentWithArrayCode = run(compile(componentWithArrayCode));
    const exampleComponentsWithArray: Record<string, RMDXModule> = {
      CompWithArray: compiledComponentWithArrayCode,
    };

    const md = '<CompWithArray array={[1, 2, 3]}/>';
    const tree = mdxish(md, { components: exampleComponentsWithArray });
    const mod = renderMdxish(tree, { components: exampleComponentsWithArray });
    render(<mod.default />);

    const wrapper = screen.getByTestId('comp-with-array');
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders an intrinsic <div> with a CSS-string style attribute', () => {
    const md = '<div style="color: rgb(0, 0, 255)">block</div>';
    const tree = mdxish(md);
    const mod = renderMdxish(tree);

    const { container } = render(<mod.default />);
    const div = container.querySelector('div[style]');
    expect(div).not.toBeNull();
    expect(div).toHaveStyle({ color: 'rgb(0, 0, 255)' });
  });
});
