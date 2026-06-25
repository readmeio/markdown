import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { captureMdxishProps, renderingEngines } from './utils';

describe('Table', () => {
  const [, renderMdxishContent] = renderingEngines.find(([label]) => label === 'mdxish')!;

  it('mdxish: lowercase <table style="..."> renders without crashing and receives style as an object', () => {
    const md =
      '<table style="color: red">\n  <tbody>\n  <tr><td>x</td></tr>\n  </tbody>\n</table>';
    const Content = renderMdxishContent(md);

    expect(() => render(<Content />)).not.toThrow();

    const captured = captureMdxishProps(md, 'table');
    expect(typeof captured.style).toBe('object');
    expect(captured.style).toMatchObject({ color: 'red' });
  });

  it('mdxish: PascalCase <Table style="..."> renders without crashing and receives style as an object', () => {
    const md =
      '<Table style="color: red">\n  <tbody>\n  <tr><td>x</td></tr>\n  </tbody>\n</Table>';
    const Content = renderMdxishContent(md);

    expect(() => render(<Content />)).not.toThrow();

    const captured = captureMdxishProps(md, 'table');
    expect(typeof captured.style).toBe('object');
    expect(captured.style).toMatchObject({ color: 'red' });
  });
});
