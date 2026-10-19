import type { Parent } from 'mdast';

import { render } from '@testing-library/react';
import React from 'react';

import { NodeTypes } from '../../enums';
import { mdxish, renderMdxish } from '../../lib';
import { collectNodes, parseMdxish, roundTripMdxish } from '../helpers';

const renderDoc = (md: string, newEditorTypes: boolean) => {
  const Content = renderMdxish(mdxish(md, { newEditorTypes })).default;
  return render(<Content />).container;
};

const renderSaved = (md: string, newEditorTypes: boolean) =>
  renderDoc(roundTripMdxish(md, { newEditorTypes }), newEditorTypes);

const editorModes = [false, true];

describe('NoTranslate', () => {
  it.each(editorModes)('newEditorTypes %s: renders its children in a translate="no" span', newEditorTypes => {
    const container = renderDoc('Hello <NoTranslate>Acme **Cloud**</NoTranslate> world', newEditorTypes);

    expect(container.querySelector('p')?.innerHTML).toBe(
      'Hello <span translate="no">Acme <strong>Cloud</strong></span> world',
    );
  });

  it.each(editorModes)('newEditorTypes %s: stays in one paragraph at the start of a line', newEditorTypes => {
    const container = renderDoc('<NoTranslate>Acme</NoTranslate> is great', newEditorTypes);

    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')?.innerHTML).toBe('<span translate="no">Acme</span> is great');
  });

  describe.each([
    ['a heading', '# Use <NoTranslate title={"x"}>Acme</NoTranslate> now', 'h1'],
    ['emphasis', '_Use <NoTranslate title={"x"}>Acme</NoTranslate> now_', 'em'],
    ['a link', '[Use <NoTranslate title={"x"}>Acme</NoTranslate> now](https://example.com)', 'a'],
    ['a table cell', '| a |\n| - |\n| Use <NoTranslate title={"x"}>Acme</NoTranslate> now |', 'td'],
  ])('with an expression attribute in %s', (_label, md, parent) => {
    it.each(editorModes)('newEditorTypes %s: stays inline after a save', newEditorTypes => {
      const container = renderSaved(md, newEditorTypes);

      expect(container.querySelector(`${parent} span[translate="no"]`)?.textContent).toBe('Acme');
      expect(container.querySelector('div[translate="no"]')).toBeNull();
    });
  });

  describe.each([
    ['a footnote defined below', '<NoTranslate>Hi[^1]</NoTranslate>\n\n[^1]: A note.'],
    ['a footnote with a mixed case label', 'Use <NoTranslate>Hi[^Note]</NoTranslate> now\n\n[^note]: A note.'],
  ])('with %s', (_label, md) => {
    it.each(editorModes)('newEditorTypes %s: links the footnote', newEditorTypes => {
      const container = renderDoc(md, newEditorTypes);

      expect(container.querySelector('span[translate="no"] sup a[data-footnote-ref]')?.textContent).toBe('1');
      expect(container.querySelector('section.footnotes li')?.textContent).toContain('A note.');
    });

    it.each(editorModes)('newEditorTypes %s: still links the footnote after a save', newEditorTypes => {
      const container = renderSaved(md, newEditorTypes);

      expect(container.querySelector('span[translate="no"] sup a[data-footnote-ref]')?.textContent).toBe('1');
    });
  });

  it.each(editorModes)('newEditorTypes %s: keeps an undefined footnote as text', newEditorTypes => {
    const container = renderDoc('<NoTranslate>Hi[^1]</NoTranslate>', newEditorTypes);

    expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('Hi[^1]');
  });

  describe('block form', () => {
    const block = '<NoTranslate>\nPara one **bold**\n\nPara two\n</NoTranslate>\n\nafter';
    const html = '<div translate="no"><p>Para one <strong>bold</strong></p><p>Para two</p></div><p>after</p>';

    it.each(editorModes)('newEditorTypes %s: renders a div around its paragraphs', newEditorTypes => {
      expect(renderDoc(block, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(html);
    });

    it.each(editorModes)('newEditorTypes %s: still renders a div after a save', newEditorTypes => {
      expect(renderSaved(block, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(html);
    });

    describe('with text right after the opener', () => {
      const spread = '<NoTranslate>one **bold**\n\ntwo</NoTranslate>\n\nafter';
      const spreadHtml = '<div translate="no"><p>one <strong>bold</strong></p><p>two</p></div><p>after</p>';

      it.each(editorModes)('newEditorTypes %s: wraps every paragraph up to the closer', newEditorTypes => {
        expect(renderDoc(spread, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(spreadHtml);
      });

      it.each(editorModes)('newEditorTypes %s: still wraps them after a save', newEditorTypes => {
        expect(renderSaved(spread, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(spreadHtml);
      });

      describe.each([
        ['a list', '<NoTranslate>- one\n- two\n</NoTranslate>\n\nafter', '<div translate="no"><ul><li>one</li><li>two</li></ul></div>'],
        ['a paragraph', '<NoTranslate>one\n  </NoTranslate>\n\nafter', '<div translate="no"><p>one</p></div>'],
        ['a list closing on its last line', '<NoTranslate>- one\n- two</NoTranslate>  \n\nafter', '<div translate="no"><ul><li>one</li><li>two</li></ul></div>'],
        ['a paragraph closing on its last line', '<NoTranslate>one\ntwo</NoTranslate>\n\nafter', '<div translate="no"><p>one<br>two</p></div>'],
      ])('with the closer ending a later line around %s', (_label, md, wrapped) => {
        it.each(editorModes)('newEditorTypes %s: wraps it in a div', newEditorTypes => {
          expect(renderDoc(md, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(`${wrapped}<p>after</p>`);
        });

        it.each(editorModes)('newEditorTypes %s: still wraps it after a save', newEditorTypes => {
          expect(renderSaved(md, newEditorTypes).innerHTML.replace(/\n/g, '')).toBe(`${wrapped}<p>after</p>`);
        });
      });

      it.each(editorModes)('newEditorTypes %s: stays inline under a paragraph line', newEditorTypes => {
        const container = renderDoc('Text\n<NoTranslate>one</NoTranslate>\n\nafter', newEditorTypes);

        expect(container.querySelector('div')).toBeNull();
        expect(container.querySelector('p > span[translate="no"]')?.textContent).toBe('one');
      });
    });

    it.each(editorModes)('newEditorTypes %s: keeps lists and inline NoTranslate inside', newEditorTypes => {
      const container = renderDoc('<NoTranslate>\n- one <NoTranslate>two</NoTranslate>\n- three\n</NoTranslate>', newEditorTypes);

      expect(container.querySelectorAll('div[translate="no"] > ul > li')).toHaveLength(2);
      expect(container.querySelector('li span[translate="no"]')?.textContent).toBe('two');
    });

    it.each(editorModes)('newEditorTypes %s: wraps an expression-only block in a div', newEditorTypes => {
      const container = renderDoc('<NoTranslate>\n{"Acme"}\n</NoTranslate>', newEditorTypes);

      expect(container.querySelector('div[translate="no"]')?.textContent).toBe('Acme');
    });

    it.each(editorModes)('newEditorTypes %s: stays inline when text follows the opener', newEditorTypes => {
      const container = renderDoc('<NoTranslate>Acme</NoTranslate>\n\n<NoTranslate>Acme\nCloud</NoTranslate> after', newEditorTypes);

      expect(container.querySelector('div')).toBeNull();
      expect(container.querySelectorAll('span[translate="no"]')).toHaveLength(2);
    });

    it.each(editorModes)('newEditorTypes %s: parses the text after an empty block', newEditorTypes => {
      const container = renderSaved('<NoTranslate>\n\n</NoTranslate> [next](https://example.com)', newEditorTypes);

      expect(container.querySelector('a[href="https://example.com"]')?.textContent).toBe('next');
    });

    describe.each([
      ['an expression', '<NoTranslate>\n{"</NoTranslate>"}\n\nstill protected\n</NoTranslate>\n\nafter'],
      ['a fenced code block', '<NoTranslate>\n````\n```\n</NoTranslate>\n```\n````\n\nstill protected\n</NoTranslate>\n\nafter'],
      ['an inline NoTranslate closing on the last line', '<NoTranslate>\nkept <NoTranslate>inner\nstill protected</NoTranslate></NoTranslate>\n\nafter'],
      ['a string on the closing line', '<NoTranslate>\nstill protected {"</NoTranslate><NoTranslate>"}</NoTranslate>\n\nafter'],
      ['inline code on the closing line', '<NoTranslate>\nstill protected `</NoTranslate>`</NoTranslate>\n\nafter'],
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
      'an Anchor inside a NoTranslate',
      '<NoTranslate><Anchor target="_blank" href="https://example.com">Acme</Anchor></NoTranslate> after',
      'span[translate="no"] > a',
    ],
    [
      'a NoTranslate inside an Anchor',
      '<Anchor target="_blank" href="https://example.com"><NoTranslate>Acme</NoTranslate></Anchor> after',
      'a > span[translate="no"]',
    ],
  ])('newEditorTypes true: renders %s', (_label, md, selector) => {
    const container = renderDoc(md, true);

    expect(container.querySelector(selector)?.textContent).toBe('Acme');
    expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank');
  });

  describe.each([
    ['a paragraph', 'Before <NoTranslate></NoTranslate> after'],
    ['bold', '**Before <NoTranslate></NoTranslate> after**'],
    ['a heading', '# Before <NoTranslate></NoTranslate> after'],
    ['a link', '[Before <NoTranslate></NoTranslate> after](https://example.com)'],
    ['a table cell', '| a |\n| - |\n| Before <NoTranslate></NoTranslate> after |'],
    ['an inline JSX element', 'Text <span title={"hint"}>Before <NoTranslate></NoTranslate> after</span> end'],
  ])('empty in %s', (_label, md) => {
    it('newEditorTypes true: keeps an empty NoTranslate empty after a save', () => {
      const container = renderSaved(md, true);

      expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
      expect(container.textContent).toMatch(/Before\s*after/);
    });
  });

  it('newEditorTypes true: keeps the next line outside an empty NoTranslate after a save', () => {
    const container = renderSaved('<NoTranslate></NoTranslate>\n**after**', true);

    expect(container.querySelector('span[translate="no"]')?.innerHTML).toBe('');
    expect(container.querySelector('strong')?.textContent).toBe('after');
  });

  describe.each([
    ['a heading', '## Set up <NoTranslate>**Acme**</NoTranslate> now', 'h2'],
    ['a table cell', '| a |\n| - |\n| <NoTranslate>**Acme**</NoTranslate> |', 'td'],
  ])('with markdown inside, in %s', (_label, md, parent) => {
    it.each(editorModes)('newEditorTypes %s: parses the markdown inside the span', newEditorTypes => {
      const container = renderDoc(md, newEditorTypes);

      expect(container.querySelector(`${parent} span[translate="no"] strong`)?.textContent).toBe('Acme');
    });
  });

  it.each(editorModes)('newEditorTypes %s: renders a NoTranslate in a legacy callout heading', newEditorTypes => {
    const container = renderDoc('> 📘 Set up <NoTranslate>Acme</NoTranslate> first\n>\n> body', newEditorTypes);

    expect(container.querySelector('.callout h3 span[translate="no"]')?.textContent).toBe('Acme');
    expect(container.querySelector('.callout h3')?.textContent).toContain('Set up Acme first');
  });

  describe.each([
    ['a line break', '<NoTranslate>Acme\nCloud</NoTranslate> after', 'Acme\nCloud'],
    ['an encoded tag', '<NoTranslate>&lt;Product&gt;</NoTranslate> after', '<Product>'],
    ['escaped markdown', '<NoTranslate>\\*literal\\*</NoTranslate> after', '*literal*'],
  ])('keeps text with %s as is', (_label, md, text) => {
    it.each(editorModes)('newEditorTypes %s', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('span[translate="no"]')?.textContent).toBe(text);
    });
  });

  describe.each([
    ['spaces inside the tags', 'Use<NoTranslate> Acme </NoTranslate>now', 'Use<span translate="no"> Acme </span>now'],
    ['a body of only a space', 'Use<NoTranslate> </NoTranslate>now', 'Use<span translate="no"> </span>now'],
    [
      'markdown inside a nested NoTranslate',
      'Hello <NoTranslate>a <NoTranslate>**b**</NoTranslate> c</NoTranslate> end',
      'Hello <span translate="no">a <span translate="no"><strong>b</strong></span> c</span> end',
    ],
  ])('renders %s', (_label, md, innerHTML) => {
    it.each(editorModes)('newEditorTypes %s', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('p')?.innerHTML).toBe(innerHTML);
    });

    it.each(editorModes)('newEditorTypes %s: after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('p')?.innerHTML).toBe(innerHTML);
    });
  });

  describe('with only a comment inside', () => {
    const md = 'Use <NoTranslate>{/* internal note */}</NoTranslate> now.';

    it.each(editorModes)('newEditorTypes %s: keeps the comment hidden', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('p')?.innerHTML).toBe('Use <span translate="no"></span> now.');
    });

    it.each(editorModes)('newEditorTypes %s: keeps the comment hidden after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('p')?.innerHTML).toBe('Use <span translate="no"></span> now.');
    });
  });

  describe.each([
    ['a comment', 'Hello <NoTranslate><!-- note -->\nkept</NoTranslate> after'],
    ['an expression', 'Hello <NoTranslate>{/* note */}\nkept</NoTranslate> after'],
  ])('with %s and text on separate lines', (_label, md) => {
    it.each(editorModes)('newEditorTypes %s: keeps the text', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('[translate="no"]')?.textContent).toContain('kept');
    });

    it.each(editorModes)('newEditorTypes %s: keeps the text after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('[translate="no"]')?.textContent).toContain('kept');
    });

    it.each(editorModes)('newEditorTypes %s: keeps the block after a save', newEditorTypes => {
      expect(roundTripMdxish(md, { newEditorTypes })).toMatch(/<NoTranslate>.*note.*<\/NoTranslate>/s);
    });
  });

  describe.each([
    ['a link definition shape', 'x <NoTranslate>[a]: https://b.com</NoTranslate> y'],
    ['a bare url', 'x <NoTranslate>https://b.com</NoTranslate> y'],
  ])('with %s inside', (_label, md) => {
    it.each(editorModes)('newEditorTypes %s: renders the url as a link', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('[translate="no"] a')?.getAttribute('href')).toBe('https://b.com');
    });

    it.each(editorModes)('newEditorTypes %s: renders the url as a link after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('[translate="no"] a')?.getAttribute('href')).toBe('https://b.com');
    });
  });

  describe('with only a self-closing tag inside', () => {
    it.each(editorModes)('newEditorTypes %s: keeps the tag as an html child', newEditorTypes => {
      const tree = parseMdxish('Use <NoTranslate><Badge label="Acme" /></NoTranslate> today', { newEditorTypes });
      const [noTranslate] = collectNodes<Parent>(tree, node => node.type === NodeTypes.noTranslate || node.type === 'mdxJsxTextElement');

      expect(noTranslate.children).toStrictEqual([expect.objectContaining({ type: 'html', value: '<Badge label="Acme" />' })]);
    });
  });

  describe('with a piped code span in a table cell', () => {
    const md = '| a |\n| - |\n| Use <NoTranslate>`a\\|b`</NoTranslate> now. |';

    it.each(editorModes)('newEditorTypes %s: renders the pipe', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('td code')?.textContent).toBe('a|b');
    });

    it.each(editorModes)('newEditorTypes %s: renders the pipe after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('td code')?.textContent).toBe('a|b');
    });
  });

  describe('with a double backslash code span in a table cell', () => {
    const md = '| a |\n| - |\n| Use <NoTranslate>`a\\\\b`</NoTranslate> now. |';

    it.each(editorModes)('newEditorTypes %s: keeps both backslashes', newEditorTypes => {
      expect(renderDoc(md, newEditorTypes).querySelector('td code')?.textContent).toBe('a\\\\b');
    });

    it.each(editorModes)('newEditorTypes %s: keeps both backslashes after a save', newEditorTypes => {
      expect(renderSaved(md, newEditorTypes).querySelector('td code')?.textContent).toBe('a\\\\b');
    });
  });
});
