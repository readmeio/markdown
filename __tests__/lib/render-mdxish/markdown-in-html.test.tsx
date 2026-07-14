import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, renderMdxish, run } from '../../../lib';

// Markdown nested inside plain HTML wrappers — indented or not, at top level or
// inside custom components — must parse as markdown and re-nest into its wrapper.
// Both engines must agree, so every case renders through each to a real DOM.
//
// NOTE: markdown indented 4+ columns inside a *plain* (non-component)
// wrapper stays literal HTML text per CommonMark's indented-code-block rule — see
// the "keeps deeply indented (4+ columns) HTML lines as HTML" case below. Only
// custom-component bodies get dedented (via safeDeindent in mdx-blocks.ts) before
// re-parsing, so nesting inside a component sidesteps the limit.
const renderThrough = {
  mdxish: (md: string) => {
    const Content = renderMdxish(mdxish(md)).default;
    return render(<Content />);
  },
  mdx: (md: string) => {
    const Content = run(compile(md)).default;
    return render(<Content />);
  },
} as const;

describe.each(['mdxish', 'mdx'] as const)('markdown nested in HTML (%s engine)', engine => {
  const renderMarkdown = (md: string) => renderThrough[engine](md);

  it('renders indented markdown inside a <div> nested in <Columns>/<Column>', () => {
    const { getByTestId } = renderMarkdown(`<Columns layout="auto">
  <Column>
    <div className="simple-list" data-testid="card">
      ## Learn By Example

      Use the [Guides](https://example.com/docs) to learn about **new features**.
    </div>
  </Column>
</Columns>`);

    const card = within(getByTestId('card'));
    expect(card.getByRole('heading', { level: 2, name: /Learn By Example/ })).toBeVisible();
    expect(card.getByRole('link', { name: /Guides/ })).toHaveAttribute('href', 'https://example.com/docs');
    // Emphasis nested inside html nested inside a component still parses
    expect(card.getByText('new features').tagName).toBe('STRONG');
  });

  it('renders indented markdown directly after a top-level opening tag', () => {
    const { getByTestId } = renderMarkdown(`<div className="wrapper" data-testid="wrapper">
  ### Indented Markdown After The Opening Tag

  This paragraph has \`inline code\` and [a link](https://example.com/indented).
</div>`);

    const wrapper = within(getByTestId('wrapper'));
    expect(wrapper.getByRole('heading', { level: 3, name: /Indented Markdown After The Opening Tag/ })).toBeVisible();
    expect(wrapper.getByRole('link', { name: /a link/ })).toHaveAttribute('href', 'https://example.com/indented');
    expect(wrapper.getByText('inline code').tagName).toBe('CODE');
  });

  it('renders a blank-line separated markdown island inside a wrapper', () => {
    const { getByTestId } = renderMarkdown(`<section data-testid="island">

#### A Blank-Line Separated Island

- List item one
- List item two

</section>`);

    const section = within(getByTestId('island'));
    expect(section.getByRole('heading', { level: 4, name: /A Blank-Line Separated Island/ })).toBeVisible();
    expect(section.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps deeply indented (4+ columns) HTML lines as HTML (#1344)', () => {
    const { container, getByTestId } = renderMarkdown(`<div data-testid="glossary-links">
        <a className="glossary-letter" href="#a">A</a> |
        <a className="glossary-letter" href="#b">B</a> |
</div>`);

    const links = within(getByTestId('glossary-links')).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#a');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders an indented ordered list inside a wrapper', () => {
    const { getByTestId } = renderMarkdown(`<div className="steps" data-testid="steps">
  ###### Quickstart Steps

  1. Install the SDK
  2. Configure your **API key**
  3. Make your first request
</div>`);

    const steps = within(getByTestId('steps'));
    expect(steps.getAllByRole('listitem')).toHaveLength(3);
    expect(steps.getByText('API key').tagName).toBe('STRONG');
  });

  it('renders an indented blockquote inside a wrapper', () => {
    const { getByTestId } = renderMarkdown(`<aside data-testid="quote">
  ###### Words Of Wisdom

  > Documentation is a love letter that you write to your future self.
</aside>`);

    const quote = within(getByTestId('quote')).getByText(/love letter/);
    expect(quote.closest('blockquote')).not.toBeNull();
  });

  it('renders a markdown table island inside a wrapper', () => {
    const { getByTestId } = renderMarkdown(`<div data-testid="table-wrapper">

| Method | Path         |
| ------ | ------------ |
| GET    | /v1/examples |
| POST   | /v1/tokens   |

</div>`);

    const wrapper = within(getByTestId('table-wrapper'));
    expect(wrapper.getByRole('table')).toBeVisible();
    expect(wrapper.getByText('/v1/tokens')).toBeVisible();
  });

  it('renders markdown after a nested opening tag inside stacked plain wrappers', () => {
    const { container, getByTestId } = renderMarkdown(`<div className="outer-wrapper" data-testid="nested">
  <div className="inner-wrapper">
  ##### Markdown After A Nested Opening Tag

  Stacked plain wrappers still parse ~~strikethrough~~ and *emphasis*.
  </div>
</div>`);

    const nested = within(getByTestId('nested'));
    expect(nested.getByRole('heading', { level: 5, name: /Nested Opening Tag/ })).toBeVisible();
    expect(nested.getByText('strikethrough').tagName).toBe('DEL');
    expect(nested.getByText('emphasis').tagName).toBe('EM');
    // The indented markdown must never fall through to an indented code block
    expect(container.querySelector('pre')).toBeNull();
  });
});
