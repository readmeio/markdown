import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { vi } from 'vitest';

import { mdxish } from '../../../index';
import renderMdxish from '../../../lib/renderMdxish';

describe('Glossary', () => {
  // Make sure we don't have any console errors when rendering a glossary item
  // which has happened before & crashing the app
  // It was because of the engine was converting the Glossary item to nested <p> tags
  // which React was not happy about
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('renders a glossary item without console errors', () => {
    const md = `The term <Glossary>exogenous</Glossary> should show a tooltip on hover.
    `;
    const tree = mdxish(md);
    const mod = renderMdxish(tree);
    render(<mod.default />);
    expect(screen.getByText('exogenous')).toBeVisible();

    expect(stderrSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});