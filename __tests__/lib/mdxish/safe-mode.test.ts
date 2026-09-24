import type { CustomComponents } from '../../../types';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { vi, describe, it, expect, beforeEach } from 'vitest';

import { mdxish, mix, renderMdxish } from '../../../lib';
import * as utils from '../../../processor/utils';
import { findElementByTagName } from '../../helpers';

vi.mock('../../../processor/utils', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown> & { evaluate: (source: string) => unknown };
  return {
    ...actual,
    evaluate: vi.fn(actual.evaluate),
  };
});

const evaluateSpy = utils.evaluate as ReturnType<typeof vi.fn>;

describe('safeMode: evaluate() must never be called', () => {
  beforeEach(() => {
    evaluateSpy.mockClear();
  });

  it('does not call evaluate() for an inline MDX expression', () => {
    const html = mix('Result: {5 * 10}', { safeMode: true });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).toContain('Result: {5 * 10}');
    expect(html).not.toContain('Result: 50');
  });

  it('does not call evaluate() for an attribute expression on a custom component', () => {
    const component = {} as CustomComponents[string];
    const html = mix('<Component value={5 * 10} />', { safeMode: true, components: { Component: component } });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).toContain('value="{5 * 10}"');
    expect(html).not.toContain('value="50"');
  });

  it('does not call evaluate() for a mixed document with every expression form', () => {
    const md = `# Heading {100 + 100}

Inline: {"hi".toUpperCase()}

<Callout value={"hello".toUpperCase()}>body</Callout>`;
    const html = mix(md, { safeMode: true });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).not.toContain('200');
    expect(html).toContain('{"hi".toUpperCase()}');
    expect(html).not.toContain('HI');
    expect(html).not.toContain('HELLO');
  });

  it('DOES call evaluate() without safeMode (sanity check that the spy is wired up)', () => {
    const component = {} as CustomComponents[string];
    const html = mix('<Component value={5 * 10} />', { components: { Component: component } });
    // Attribute expressions now evaluate past rehypeRaw's clone, with the export scope passed in.
    expect(evaluateSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    expect(html).not.toContain('5 * 10');
  });
});

describe('safeMode: html blocks never render raw', () => {
  const RAW_HTML = '<img src=x onerror=mockFn()>';
  const RAW_BLOCK = `<div class="rdmd-html">${RAW_HTML}</div>`;
  const ESCAPED_BLOCK = '<pre class="html-unsafe"><code>&lt;img src=x onerror=mockFn()&gt;</code></pre>';

  const magicBlock = `[block:html]\n${JSON.stringify({ html: RAW_HTML })}\n[/block]`;
  const htmlBlock = `<HTMLBlock>{\`${RAW_HTML}\`}</HTMLBlock>`;

  const render = (md: string, opts: { safeMode?: boolean } = {}) =>
    renderToStaticMarkup(React.createElement(renderMdxish(mdxish(md, opts)).default));

  it.each([
    ['[block:html] magic block', magicBlock],
    ['<HTMLBlock>', htmlBlock],
    ['<HTMLBlock safeMode="false">', `<HTMLBlock safeMode="false">{\`${RAW_HTML}\`}</HTMLBlock>`],
    ['<HTMLBlock safeMode={false}>', `<HTMLBlock safeMode={false}>{\`${RAW_HTML}\`}</HTMLBlock>`],
    ['literal <html-block> element', `<html-block html="${RAW_HTML}"></html-block>`],
    ['<HTMLBlock html="..."> attribute form', `<HTMLBlock html="${RAW_HTML}" />`],
    ['<HTMLBlock html="..."> inline in a paragraph', `text <HTMLBlock html="${RAW_HTML}" /> more`],
    ['<htmlblock html="..."> lowercase alias', `<htmlblock html="${RAW_HTML}"></htmlblock>`],
    ['<HtmlBlock html="..."> mixed-case alias', `<HtmlBlock html="${RAW_HTML}"></HtmlBlock>`],
    ['<HTMLBlock html="..."> inside <svg>', `<svg><HTMLBlock html="${RAW_HTML}"></HTMLBlock></svg>`],
    ['<HTMLBlock> inside a component', `<Callout icon="📘">\n${htmlBlock}\n</Callout>`],
    ['<HTMLBlock> inside a table cell', `| a |\n| - |\n| ${htmlBlock} |`],
    ['<HTMLBlock> inside raw html', `<div>${htmlBlock}</div>`],
    ['[block:html] inside a list item', `- ${magicBlock}`],
  ])('renders %s escaped', (_label, md) => {
    const html = render(md, { safeMode: true });
    expect(html).toContain(ESCAPED_BLOCK);
    expect(html).not.toContain(RAW_HTML);
  });

  it('stamps safeMode on the [block:html] node itself', () => {
    const node = findElementByTagName(mdxish(magicBlock, { safeMode: true }), 'html-block');
    expect(node).toMatchObject({ properties: { html: RAW_HTML, safeMode: 'true' } });
  });

  it('keeps runScripts alongside the stamped safeMode', () => {
    const md = `<HTMLBlock runScripts="true">{\`${RAW_HTML}\`}</HTMLBlock>`;
    const node = findElementByTagName(mdxish(md, { safeMode: true }), 'html-block');
    expect(node).toMatchObject({ properties: { html: RAW_HTML, runScripts: true, safeMode: 'true' } });
  });

  it.each([
    ['[block:html] magic block', magicBlock],
    ['<HTMLBlock>', htmlBlock],
  ])('still renders %s raw without safeMode', (_label, md) => {
    expect(render(md)).toContain(RAW_BLOCK);
  });
});
