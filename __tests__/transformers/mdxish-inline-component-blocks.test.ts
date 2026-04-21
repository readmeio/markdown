import type { Html, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { describe, expect, it } from 'vitest';

import { htmlLowercaseFromMarkdown } from '../../lib/mdast-util/html-lowercase';
import { mdxComponentFromMarkdown } from '../../lib/mdast-util/mdx-component';
import { htmlLowercase } from '../../lib/micromark/html-lowercase';
import { mdxComponent } from '../../lib/micromark/mdx-component';
import mdxishComponentBlocks from '../../processor/transform/mdxish/mdxish-component-blocks';
import mdxishInlineComponentBlocks from '../../processor/transform/mdxish/mdxish-inline-component-blocks';
import { collectNodes } from '../helpers';

// Mirrors the relevant slice of the mdxish pipeline: tokenizers + both
// component-block transformers. Keeps tests honest about extension ordering.
const parse = (md: string): Root => {
  const processor = unified()
    .data('micromarkExtensions', [mdxComponent(), htmlLowercase()])
    .data('fromMarkdownExtensions', [mdxComponentFromMarkdown(), htmlLowercaseFromMarkdown()])
    .use(remarkParse)
    .use(mdxishComponentBlocks)
    .use(mdxishInlineComponentBlocks);
  const tree = processor.parse(md);
  processor.runSync(tree);
  return tree as Root;
};

describe('mdxishInlineComponentBlocks', () => {
  it('promotes lowercase inline tags with expression attrs to mdxJsxTextElement', () => {
    const tree = parse('before <a href={url}>link</a> after');
    const [inline] = collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
    expect(inline).toMatchObject({
      type: 'mdxJsxTextElement',
      name: 'a',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'href',
          value: { type: 'mdxJsxAttributeValueExpression', value: 'url' },
        },
      ],
      children: [{ type: 'text', value: 'link' }],
    });
  });

  it('handles self-closing inline lowercase with expression attr', () => {
    const tree = parse('before <img src={u} /> after');
    const [inline] = collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
    expect(inline).toMatchObject({ type: 'mdxJsxTextElement', name: 'img', children: [] });
  });

  it('leaves lowercase inline html without expression attrs as-is', () => {
    // Plain inline HTML (no `{…}`) stays an html node for rehype-raw/parse5.
    const tree = parse('before <a href="x">link</a> after');
    expect(collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement')).toHaveLength(0);
    const htmlNodes = collectNodes<Html>(tree, 'html');
    expect(htmlNodes.some(n => n.value.includes('<a href="x">link</a>'))).toBe(true);
  });

  it('does not touch inline PascalCase components — mdxishComponentBlocks owns them', () => {
    // PascalCase is flow-level by design; it becomes `mdxJsxFlowElement` via
    // the block transformer even when authored inline, so the inline pass
    // must leave those nodes alone.
    const tree = parse('before <Component foo="bar" /> after');
    expect(collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement')).toHaveLength(0);
    const [flow] = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
    expect(flow).toMatchObject({ type: 'mdxJsxFlowElement', name: 'Component' });
  });

  it('leaves block-level lowercase-expression tags as mdxJsxFlowElement', () => {
    // `<a href={url}>x</a>` on its own line is claimed by mdxComponent flow
    // and promoted by mdxishComponentBlocks — the inline pass must not see it.
    const tree = parse('<a href={url}>x</a>');
    expect(collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement')).toHaveLength(0);
    const [flow] = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');
    expect(flow).toMatchObject({ type: 'mdxJsxFlowElement', name: 'a' });
  });
});
