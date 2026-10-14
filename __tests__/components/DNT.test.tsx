import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../lib';
import { roundTripMdxish } from '../helpers';

const renderDoc = (md: string, newEditorTypes: boolean) => {
  const Content = renderMdxish(mdxish(md, { newEditorTypes })).default;
  return render(<Content />).container;
};

const renderSaved = (md: string, newEditorTypes: boolean) =>
  renderDoc(roundTripMdxish(md, { newEditorTypes }), newEditorTypes);

const editorModes = [false, true];

describe('DNT', () => {
  it.each(editorModes)('newEditorTypes %s: renders its children in a translate="no" span', newEditorTypes => {
    const container = renderDoc('Hello <DNT>Acme **Cloud**</DNT> world', newEditorTypes);

    expect(container.querySelector('p')?.innerHTML).toBe(
      'Hello <span translate="no">Acme <strong>Cloud</strong></span> world',
    );
  });

  it.each(editorModes)('newEditorTypes %s: stays in one paragraph at the start of a line', newEditorTypes => {
    const container = renderDoc('<DNT>Acme</DNT> is great', newEditorTypes);

    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')?.innerHTML).toBe('<span translate="no">Acme</span> is great');
  });

  describe.each([
    ['a heading', '# Use <DNT title={"x"}>Acme</DNT> now', 'h1'],
    ['emphasis', '_Use <DNT title={"x"}>Acme</DNT> now_', 'em'],
    ['a link', '[Use <DNT title={"x"}>Acme</DNT> now](https://example.com)', 'a'],
    ['a table cell', '| a |\n| - |\n| Use <DNT title={"x"}>Acme</DNT> now |', 'td'],
  ])('with an expression attribute in %s', (_label, md, parent) => {
    it.each(editorModes)('newEditorTypes %s: stays inline after a save', newEditorTypes => {
      const container = renderSaved(md, newEditorTypes);

      expect(container.querySelector(`${parent} span[translate="no"]`)?.textContent).toBe('Acme');
      expect(container.querySelector('div[translate="no"]')).toBeNull();
    });
  });

  describe('block form', () => {
    const block = '<DNT>\nPara one **bold**\n\nPara two\n</DNT>\n\nafter';
    const html = '<div translate="no"><p>Para one <strong>bold</strong></p><p>Para two</p></div><p>after</p>';

    it.each(editorModes)('newEditorTypes %s: renders a div around its paragraphs', newEditorTypes => {
      expect(renderDoc(block, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(html);
    });

    it.each(editorModes)('newEditorTypes %s: still renders a div after a save', newEditorTypes => {
      expect(renderSaved(block, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(html);
    });

    describe('with text right after the opener', () => {
      const spread = '<DNT>one **bold**\n\ntwo</DNT>\n\nafter';
      const spreadHtml = '<div translate="no"><p>one <strong>bold</strong></p><p>two</p></div><p>after</p>';

      it.each(editorModes)('newEditorTypes %s: wraps every paragraph up to the closer', newEditorTypes => {
        expect(renderDoc(spread, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(spreadHtml);
      });

      it.each(editorModes)('newEditorTypes %s: still wraps them after a save', newEditorTypes => {
        expect(renderSaved(spread, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(spreadHtml);
      });

      it.each(editorModes)('newEditorTypes %s: stays inline under a paragraph line', newEditorTypes => {
        const container = renderDoc('Text\n<DNT>one</DNT>\n\nafter', newEditorTypes);

        expect(container.querySelector('div')).toBeNull();
        expect(container.querySelector('p > span[translate="no"]')?.textContent).toBe('one');
      });
    });

    it.each(editorModes)('newEditorTypes %s: keeps lists and inline DNT inside', newEditorTypes => {
      const container = renderDoc('<DNT>\n- one <DNT>two</DNT>\n- three\n</DNT>', newEditorTypes);

      expect(container.querySelectorAll('div[translate="no"] > ul > li')).toHaveLength(2);
      expect(container.querySelector('li span[translate="no"]')?.textContent).toBe('two');
    });

    it.each(editorModes)('newEditorTypes %s: wraps an expression-only block in a div', newEditorTypes => {
      const container = renderDoc('<DNT>\n{"Acme"}\n</DNT>', newEditorTypes);

      expect(container.querySelector('div[translate="no"]')?.textContent).toBe('Acme');
    });

    it.each(editorModes)('newEditorTypes %s: stays inline when text follows the opener', newEditorTypes => {
      const container = renderDoc('<DNT>Acme</DNT>\n\n<DNT>Acme\nCloud</DNT> after', newEditorTypes);

      expect(container.querySelector('div')).toBeNull();
      expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(2);
    });

    it.each(editorModes)('newEditorTypes %s: parses the text after an empty block', newEditorTypes => {
      const container = renderSaved('<DNT>\n\n</DNT> [next](https://example.com)', newEditorTypes);

      expect(container.querySelector('a[href="https://example.com"]')?.textContent).toBe('next');
    });

    describe.each([
      ['an expression', '<DNT>\n{"</DNT>"}\n\nstill protected\n</DNT>\n\nafter'],
      ['a fenced code block', '<DNT>\n````\n```\n</DNT>\n```\n````\n\nstill protected\n</DNT>\n\nafter'],
      ['an inline DNT closing on the last line', '<DNT>\nkept <DNT>inner\nstill protected</DNT></DNT>\n\nafter'],
      ['a string on the closing line', '<DNT>\nstill protected {"</DNT><DNT>"}</DNT>\n\nafter'],
      ['inline code on the closing line', '<DNT>\nstill protected `</DNT>`</DNT>\n\nafter'],
    ])('with a closing tag inside %s', (_label, md) => {
      it.each(editorModes)('newEditorTypes %s: keeps the block whole after a save', newEditorTypes => {
        const text = renderSaved(md, newEditorTypes).querySelector('div[translate="no"]')?.textContent;

        expect(text).toContain('still protected');
        expect(text).not.toContain('after');
      });
    });
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
  ])('newEditorTypes true: renders %s', (_label, md, selector) => {
    const container = renderDoc(md, true);

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
    it('newEditorTypes true: keeps an empty DNT empty after a save', () => {
      const container = renderSaved(md, true);

      expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
      expect(container.textContent).toMatch(/Before\s*after/);
    });
  });

  it('newEditorTypes true: keeps the next line outside an empty DNT after a save', () => {
    const container = renderSaved('<DNT></DNT>\n**after**', true);

    expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
    expect(container.querySelector('strong')?.textContent).toBe('after');
  });

  describe.each([
    ['a line break', '<DNT>Acme\nCloud</DNT> after', 'Acme\nCloud'],
    ['an encoded tag', '<DNT>&lt;Product&gt;</DNT> after', '<Product>'],
    ['escaped markdown', '<DNT>\\*literal\\*</DNT> after', '*literal*'],
  ])('keeps text with %s as is', (_label, md, text) => {
    it.each(editorModes)('newEditorTypes %s', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('span[translate="no"]')?.textContent).toBe(text);
    });
  });
});
