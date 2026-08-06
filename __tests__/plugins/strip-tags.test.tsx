import type { Root } from 'hast';
import type { MDXContent } from 'mdx/types';

import React from 'react';
import { renderToString } from 'react-dom/server';
import { unified } from 'unified';
import { afterEach, describe, expect, it } from 'vitest';

import { compile, mdxish, renderMdxish } from '../../lib';
import { rehypeStripTags, STRIPPED_TAG_NAMES } from '../../processor/plugin/strip-tags';
import { execute, findElementByTagName } from '../helpers';

// Stripping is opt-in, so every engine here passes `sanitize: true`. The default
// (off) is covered by the `sanitize option` block below.
const primaryEngines = [
  ['mdx', (md: string) => execute(md, { sanitize: true }) as MDXContent] as const,
  ['mdxish', (md: string) => renderMdxish(mdxish(md, { sanitize: true })).default as MDXContent] as const,
];

const engines = [
  ...primaryEngines,
  ['md', (md: string) => execute(md, { format: 'md', sanitize: true }) as MDXContent] as const,
  [
    'mdxish newEditorTypes',
    (md: string) => renderMdxish(mdxish(md, { newEditorTypes: true, sanitize: true })).default as MDXContent,
  ] as const,
  [
    'mdxish safeMode',
    (md: string) => renderMdxish(mdxish(md, { safeMode: true, sanitize: true })).default as MDXContent,
  ] as const,
];

describe('strip tags', () => {
  describe.each(engines)('%s engine', (_, render) => {
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

  // `<math><mtext>` is a text-integration point that switches the parser back to
  // HTML, which is the namespace-confusion bypass.
  describe.each(primaryEngines)('%s engine, nested in a wrapper tag', (_, render) => {
    it.each([
      ['math/mtext', '<math><mtext><script>alert(1)</script></mtext></math>'],
      ['svg', '<svg><script>alert(1)</script></svg>'],
      ['noscript', '<noscript><script>alert(1)</script></noscript>'],
      ['template', '<template><script>alert(1)</script></template>'],
    ])('strips a <script> nested inside %s', (_wrapper, md) => {
      const Content = render(md);
      const html = renderToString(<Content />);

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
    });
  });

  describe.each(primaryEngines)('%s engine, nested in a container', (_, render) => {
    it('strips a <script> in a table cell', () => {
      const Content = render('| a | b |\n| --- | --- |\n| <script>alert(1)</script> | safe |');
      const html = renderToString(<Content />);

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
      expect(html).toContain('safe');
    });

    it('strips a <script> in a custom component body', () => {
      const Content = render('<Callout icon="ℹ️">\n  <script>alert(1)</script>\n</Callout>');
      const html = renderToString(<Content />);

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
      expect(html).toContain('callout');
    });
  });

  // MDX rejects `<!-- -->` at parse time (it wants `{/* */}`), so only mdxish can
  // reach this case.
  it('mdxish: does not render a <script> inside an HTML comment', () => {
    const Content = renderMdxish(mdxish('<!-- <script>alert(1)</script> -->', { sanitize: true }))
      .default as MDXContent;
    const html = renderToString(<Content />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  describe('sanitize option', () => {
    const doc = '<script>alert(1)</script>';

    const sanitizeEngines = [
      ['mdx', (sanitize?: boolean) => execute(doc, { sanitize }) as MDXContent] as const,
      ['mdxish', (sanitize?: boolean) => renderMdxish(mdxish(doc, { sanitize })).default as MDXContent] as const,
    ];

    it.each(sanitizeEngines)('%s: keeps the script by default', (_engine, render) => {
      expect(renderToString(React.createElement(render(undefined)))).toContain('alert(1)');
    });

    it.each(sanitizeEngines)('%s: keeps the script when explicitly disabled', (_engine, render) => {
      expect(renderToString(React.createElement(render(false)))).toContain('alert(1)');
    });

    it.each(sanitizeEngines)('%s: strips the script when enabled', (_engine, render) => {
      const html = renderToString(React.createElement(render(true)));

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
    });
  });

  // Caller plugins must extend the pipeline, not replace it, or the stripper disappears.
  describe('caller-supplied rehype plugins', () => {
    it.each([['empty array', []] as const, ['null', null] as const])(
      'cannot displace the script stripper (%s)',
      (_label, rehypePlugins) => {
        const Content = execute('<script>alert(1)</script>', { rehypePlugins, sanitize: true }) as MDXContent;
        const html = renderToString(<Content />);

        expect(html).not.toContain('<script');
        expect(html).not.toContain('alert(1)');
      },
    );

    it('extends the pipeline rather than replacing it', () => {
      const appendMarker = () => (tree: Root) => {
        tree.children.push({
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: 'caller-plugin-ran' }],
        });
      };

      const Content = execute('# Heading\n\n<script>alert(1)</script>', {
        rehypePlugins: [appendMarker],
        sanitize: true,
      }) as MDXContent;
      const html = renderToString(<Content />);

      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
      expect(html).toContain('caller-plugin-ran');
      // `rehypeSlug` ships in the default rehype plugins; its id proves they survived.
      expect(html).toContain('id="heading"');
    });
  });

  // `iframe` stands in for a future vector; only `script` ships in the set today.
  describe('STRIPPED_TAG_NAMES drives what gets stripped', () => {
    const doc = '<iframe src="https://example.com/evil"></iframe>';

    afterEach(() => {
      STRIPPED_TAG_NAMES.delete('iframe');
    });

    it.each(primaryEngines)('%s: leaves a tag that is not in the set', (_engine, render) => {
      expect(renderToString(React.createElement(render(doc)))).toContain('<iframe');
    });

    it.each(primaryEngines)('%s: strips a tag once it is added to the set', (_engine, render) => {
      STRIPPED_TAG_NAMES.add('iframe');

      expect(renderToString(React.createElement(render(doc)))).not.toContain('<iframe');
    });
  });

  describe('rehypeStripTags plugin', () => {
    it('strips case-variant literal script nodes but not Script component references', () => {
      const tree: Root = {
        type: 'root',
        children: [
          { type: 'element', tagName: 'script', properties: {}, children: [] },
          { type: 'element', tagName: 'sCrIpT', properties: {}, children: [] },
          { type: 'mdxJsxFlowElement', name: 'script', attributes: [], children: [] },
          { type: 'mdxJsxFlowElement', name: 'sCrIpT', attributes: [], children: [] },
          { type: 'mdxJsxTextElement', name: 'script', attributes: [], children: [] },
          { type: 'mdxJsxFlowElement', name: 'Script', attributes: [], children: [] },
          { type: 'element', tagName: 'p', properties: {}, children: [] },
        ],
      };

      const result = unified().use(rehypeStripTags).runSync(tree);

      expect(result.children).toMatchObject([{ name: 'Script' }, { tagName: 'p' }]);
    });
  });

  // HTMLBlock scripts live in a string prop, so the plugin must leave them intact.
  describe('HTMLBlock exemption', () => {
    const doc = '<HTMLBlock>{`<script>alert(1)</script>`}</HTMLBlock>';

    it('keeps HTMLBlock scripts in the mdxish html property', () => {
      const htmlBlock = findElementByTagName(mdxish(doc, { sanitize: true }), 'html-block');

      expect(htmlBlock).toMatchObject({
        properties: { html: '<script>alert(1)</script>' },
      });
    });

    it('keeps HTMLBlock scripts in the compiled mdx output', () => {
      expect(compile(doc, { sanitize: true })).toContain('<script>alert(1)</script>');
    });
  });
});
