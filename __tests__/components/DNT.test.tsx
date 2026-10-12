import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { roundTripMdxish } from '../helpers';

import { renderingEngines } from './utils';

describe('DNT', () => {
  it.each(renderingEngines)('%s: renders its children in a translate="no" span', (_label, renderContent) => {
    const Content = renderContent('Hello <DNT>Acme **Cloud**</DNT> world');

    const { container } = render(<Content />);

    expect(container.querySelector('p')?.innerHTML).toBe(
      'Hello <span translate="no">Acme <strong>Cloud</strong></span> world',
    );
  });

  it.each(renderingEngines)('%s: stays in one paragraph at the start of a line', (_label, renderContent) => {
    const Content = renderContent('<DNT>Acme</DNT> is great');

    const { container } = render(<Content />);

    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')?.innerHTML).toBe('<span translate="no">Acme</span> is great');
  });

  it('mdxish: renders the span from the readme-dnt node with newEditorTypes', () => {
    const Content = renderMdxish(mdxish('Hello <DNT>Acme **Cloud**</DNT> world', { newEditorTypes: true })).default;

    const { container } = render(<Content />);

    expect(container.querySelector('p')?.innerHTML).toBe(
      'Hello <span translate="no">Acme <strong>Cloud</strong></span> world',
    );
  });

  it.each([
    [
      'an Anchor inside a DNT',
      '<DNT><Anchor target="_blank" href="https://example.com">Acme</Anchor></DNT> after',
      'span[translate="no"] > a',
    ],
    [
      'a DNT inside an Anchor',
      '<Anchor target="_blank" href="https://example.com"><DNT>Acme</DNT></Anchor> after',
      'a > span[translate="no"]',
    ],
  ])('mdxish with newEditorTypes: renders %s', (_label, md, selector) => {
    const Content = renderMdxish(mdxish(md, { newEditorTypes: true })).default;

    const { container } = render(<Content />);

    expect(container.querySelector(selector)?.textContent).toBe('Acme');
    expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank');
  });

  describe.each([
    ['a paragraph', 'Before <DNT></DNT> after'],
    ['bold', '**Before <DNT></DNT> after**'],
    ['a heading', '# Before <DNT></DNT> after'],
    ['a link', '[Before <DNT></DNT> after](https://example.com)'],
    ['a table cell', '| a |\n| - |\n| Before <DNT></DNT> after |'],
    ['an inline JSX element', 'Text <span title={"hint"}>Before <DNT></DNT> after</span> end'],
  ])('empty in %s', (_label, md) => {
    it('mdxish with newEditorTypes: keeps an empty DNT empty after a save', () => {
      const saved = roundTripMdxish(md, { newEditorTypes: true });
      const Content = renderMdxish(mdxish(saved, { newEditorTypes: true })).default;

      const { container } = render(<Content />);

      expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
      expect(container.textContent).toMatch(/Before\s*after/);
    });
  });

  it('mdxish with newEditorTypes: keeps the next line outside an empty DNT after a save', () => {
    const saved = roundTripMdxish('<DNT></DNT>\n**after**', { newEditorTypes: true });
    const Content = renderMdxish(mdxish(saved, { newEditorTypes: true })).default;

    const { container } = render(<Content />);

    expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
    expect(container.querySelector('strong')?.textContent).toBe('after');
  });

  describe.each([
    ['a line break', '<DNT>Acme\nCloud</DNT> after', 'Acme\nCloud'],
    ['an encoded tag', '<DNT>&lt;Product&gt;</DNT> after', '<Product>'],
    ['escaped markdown', '<DNT>\\*literal\\*</DNT> after', '*literal*'],
  ])('keeps text with %s as is', (_label, md, text) => {
    it.each(renderingEngines)('%s', (_engine, renderContent) => {
      const Content = renderContent(md);

      const { container } = render(<Content />);

      expect(container.querySelector('span[translate="no"]')?.textContent).toBe(text);
    });

    it('mdxish with newEditorTypes', () => {
      const Content = renderMdxish(mdxish(md, { newEditorTypes: true })).default;

      const { container } = render(<Content />);

      expect(container.querySelector('span[translate="no"]')?.textContent).toBe(text);
    });
  });
});
