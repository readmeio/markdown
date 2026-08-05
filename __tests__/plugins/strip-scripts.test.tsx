import type { Root } from 'hast';
import type { MDXContent } from 'mdx/types';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { compile, mdxish, renderMdxish } from '../../lib';
import { rehypeStripScripts } from '../../processor/plugin/strip-scripts';
import { renderingEngines } from '../components/utils';
import { execute, findElementByTagName } from '../helpers';

const engines = [
  ...renderingEngines,
  ['md', (md: string) => execute(md, { format: 'md' }) as MDXContent] as const,
  ['mdxish newEditorTypes', (md: string) => renderMdxish(mdxish(md, { newEditorTypes: true })).default] as const,
  ['mdxish safeMode', (md: string) => renderMdxish(mdxish(md, { safeMode: true })).default] as const,
];

describe.each(engines)('strip scripts (%s engine)', (_, render) => {
  it('strips a bare <script> tag from page content', () => {
    const Content = render('<script>alert(1)</script>');
    const html = renderToString(<Content />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips a <script> tag while preserving surrounding content', () => {
    const Content = render('hello\n\n<script>alert(1)</script>\n\nworld');
    const html = renderToString(<Content />);

    expect(html).not.toContain('<script');
    expect(html).toContain('hello');
    expect(html).toContain('world');
  });

  it('strips a <script> tag nested inside other HTML', () => {
    const Content = render('<div><script>alert(1)</script><span>safe</span></div>');
    const html = renderToString(<Content />);

    expect(html).not.toContain('<script');
    expect(html).toContain('safe');
  });

  it('strips a <script> tag with a src attribute', () => {
    const Content = render('<script src="https://example.com/evil.js"></script>');
    const html = renderToString(<Content />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('evil.js');
  });

  it('leaves script tags inside code blocks alone', () => {
    const Content = render('```html\n<script>alert(1)</script>\n```');
    const html = renderToString(<Content />);

    expect(html).toContain('alert(1)');
  });
});

describe('rehypeStripScripts plugin', () => {
  it('strips case-variant literal script nodes but not Script component references', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'script', properties: {}, children: [] },
        { type: 'element', tagName: 'sCrIpT', properties: {}, children: [] },
        { type: 'mdxJsxFlowElement', name: 'script', attributes: [], children: [] },
        { type: 'mdxJsxFlowElement', name: 'sCrIpT', attributes: [], children: [] },
        { type: 'mdxJsxFlowElement', name: 'Script', attributes: [], children: [] },
        { type: 'element', tagName: 'p', properties: {}, children: [] },
      ],
    };

    const result = unified().use(rehypeStripScripts).runSync(tree);

    expect(result.children).toMatchObject([{ name: 'Script' }, { tagName: 'p' }]);
  });
});

/**
 * `HTMLBlock` scripts live in a string prop rather than as elements, so the plugin
 * must leave them intact — they only run client-side behind `runScripts`.
 */
describe('HTMLBlock exemption', () => {
  const doc = '<HTMLBlock>{`<script>alert(1)</script>`}</HTMLBlock>';

  it('keeps HTMLBlock scripts in the mdxish html property', () => {
    const htmlBlock = findElementByTagName(mdxish(doc), 'html-block');

    expect(htmlBlock).toMatchObject({
      properties: { html: '<script>alert(1)</script>' },
    });
  });

  it('keeps HTMLBlock scripts in the compiled mdx output', () => {
    expect(compile(doc)).toContain('<script>alert(1)</script>');
  });
});
