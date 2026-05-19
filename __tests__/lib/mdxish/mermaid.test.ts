import type { Element } from 'hast';

import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib/mdxish';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

/**
 * `mdxishMermaidTransformer` adds a `mermaid-render` className to <pre>
 * wrappers whose <code> child has `lang === 'mermaid'`. The `lang` property
 * is populated by `codeTabsTransformer` on every `code` mdast node, so the
 * mermaid class only lands when codeTabs has visited the node first.
 *
 * Both transformers now run *after* `mdxishMdxComponentBlocks` re-parses
 * component bodies, so mermaid blocks should also work inside `<Tabs>`,
 * `<Callout>`, lists, etc.
 */
describe('mermaid diagrams', () => {
  it('adds mermaid-render class to a top-level mermaid fenced block', () => {
    const tree = mdxish('```mermaid\ngraph TD\nA-->B\n```');

    const pre = findElementByTagName(tree, 'pre');
    expect(pre).toMatchObject({
      type: 'element',
      tagName: 'pre',
      properties: { className: ['mermaid-render'] },
    });
  });

  describe('nested inside components', () => {
    it('adds mermaid-render class when nested inside <Tabs><Tab>', () => {
      const tree = mdxish('<Tabs>\n<Tab title="x">\n\n```mermaid\ngraph TD\nA-->B\n```\n\n</Tab>\n</Tabs>');

      const pre = findElementByTagName(tree, 'pre');
      expect(pre).toMatchObject({
        type: 'element',
        tagName: 'pre',
        properties: { className: ['mermaid-render'] },
      });

      const code = findElementByTagName(pre as Element, 'code');
      expect(code).toMatchObject({
        properties: { className: ['language-mermaid'], lang: 'mermaid' },
      });
    });

    it('adds mermaid-render class when nested inside <Callout>', () => {
      const tree = mdxish('<Callout icon="📘">\n\n```mermaid\ngraph TD\nA-->B\n```\n\n</Callout>');

      const pre = findElementByTagName(tree, 'pre');
      expect(pre).toMatchObject({
        type: 'element',
        tagName: 'pre',
        properties: { className: ['mermaid-render'] },
      });
    });

    it('adds mermaid-render class to a mermaid block nested inside a list inside <Tabs>', () => {
      const tree = mdxish(
        '<Tabs>\n<Tab title="x">\n\n1. Step\n\n   ```mermaid\n   graph TD\n   A-->B\n   ```\n\n</Tab>\n</Tabs>',
      );

      const pres = findAllElementsByTagName(tree, 'pre');
      const mermaidPre = pres.find(p => Array.isArray(p.properties?.className) && p.properties.className.includes('mermaid-render'));
      expect(mermaidPre).toBeDefined();
    });

    it('does NOT add mermaid-render class to non-mermaid fenced blocks inside components', () => {
      const tree = mdxish('<Tabs>\n<Tab title="x">\n\n```js\nconst x = 1;\n```\n\n</Tab>\n</Tabs>');

      const pre = findElementByTagName(tree, 'pre');
      const className = pre?.properties?.className;
      expect(Array.isArray(className) ? className : []).not.toContain('mermaid-render');
    });
  });
});
