import type { RenderResult } from '@testing-library/react';

import fs from 'node:fs';

import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, renderMdxish, run } from '../../../lib';

const body = fs.readFileSync('__tests__/fixtures/markdown-in-html-tests.mdx', { encoding: 'utf8' });

// Renders the fixture to a real DOM through each engine. Both must agree:
// markdown nested inside plain HTML wrappers (indented or not, nested in
// custom components or not) parses as markdown and re-nests into its wrapper.
const engines: Record<string, () => RenderResult> = {
  mdxish: () => {
    const mod = renderMdxish(mdxish(body));
    const Content = mod.default;
    return render(<Content />);
  },
  mdx: () => {
    const Content = run(compile(body)).default;
    return render(<Content />);
  },
};

describe.each(Object.keys(engines))('markdown nested in HTML fixture (%s engine)', engine => {
  const renderFixture = () => engines[engine]();

  it('renders indented markdown inside a <div> nested in <Columns>/<Column>', () => {
    const { getByTestId } = renderFixture();

    const firstCard = within(getByTestId('column-card-1'));
    expect(firstCard.getByRole('heading', { level: 2, name: /Learn By Example/ })).toBeVisible();
    expect(firstCard.getByRole('link', { name: /Guides/ })).toHaveAttribute('href', 'https://example.com/docs');

    const secondCard = within(getByTestId('column-card-2'));
    expect(secondCard.getByRole('heading', { level: 2, name: /Stay Informed/ })).toBeVisible();
    expect(secondCard.getByRole('link', { name: /Release Notes/ })).toHaveAttribute(
      'href',
      'https://example.com/changelog',
    );
    // Emphasis nested inside html nested inside components still parses
    expect(secondCard.getByText('new features').tagName).toBe('STRONG');
  });

  it('renders indented markdown directly after a top-level opening tag', () => {
    const { getByTestId } = renderFixture();

    const wrapper = within(getByTestId('top-level-wrapper'));
    expect(wrapper.getByRole('heading', { level: 3, name: /Indented Markdown After The Opening Tag/ })).toBeVisible();
    expect(wrapper.getByRole('link', { name: /a link/ })).toHaveAttribute('href', 'https://example.com/indented');
    expect(wrapper.getByText('inline code').tagName).toBe('CODE');
  });

  it('renders a blank-line separated markdown island inside a wrapper', () => {
    const { getByTestId } = renderFixture();

    const section = within(getByTestId('island-section'));
    expect(section.getByRole('heading', { level: 4, name: /A Blank-Line Separated Island/ })).toBeVisible();
    expect(section.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps deeply indented (4+ columns) HTML lines as HTML', () => {
    const { getByTestId } = renderFixture();

    const links = within(getByTestId('glossary-links')).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#a');
  });

  it('renders an indented ordered list inside a wrapper', () => {
    const { getByTestId } = renderFixture();

    const steps = within(getByTestId('ordered-steps'));
    expect(steps.getAllByRole('listitem')).toHaveLength(3);
    expect(steps.getByText('API key').tagName).toBe('STRONG');
  });

  it('renders an indented blockquote inside a wrapper', () => {
    const { getByTestId } = renderFixture();

    const quote = within(getByTestId('quote-aside')).getByText(/love letter/);
    expect(quote.closest('blockquote')).not.toBeNull();
  });

  it('renders a markdown table island inside a wrapper', () => {
    const { getByTestId } = renderFixture();

    const wrapper = within(getByTestId('table-wrapper'));
    expect(wrapper.getByRole('table')).toBeVisible();
    expect(wrapper.getByText('/v1/tokens')).toBeVisible();
  });

  it('renders markdown after a nested opening tag inside stacked plain wrappers', () => {
    const { getByTestId } = renderFixture();

    const nested = within(getByTestId('nested-wrappers'));
    expect(nested.getByRole('heading', { level: 5, name: /Nested Opening Tag/ })).toBeVisible();
    expect(nested.getByText('strikethrough').tagName).toBe('DEL');
    expect(nested.getByText('emphasis').tagName).toBe('EM');
  });

  it('never renders the nested markdown as an indented code block', () => {
    const { container } = renderFixture();

    expect(container.querySelector('pre')).toBeNull();
  });
});
