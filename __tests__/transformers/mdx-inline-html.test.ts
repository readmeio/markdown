import type { Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { describe, expect, it } from 'vitest';

import { mdxComponentFromMarkdown } from '../../lib/mdast-util/mdx-component';
import { mdxComponent } from '../../lib/micromark/mdx-component';
import mdxishInlineMdxHtmlBlocks from '../../processor/transform/mdxish/components/inline-html';
import mdxishMdxComponentBlocks from '../../processor/transform/mdxish/components/mdx-blocks';
import { collectNodes } from '../helpers';

// Mirrors the relevant slice of the mdxish pipeline: tokenizer + both
// component-block transformers. Keeps tests honest about extension ordering.
const parse = (md: string): Root => {
  const processor = unified()
    .data('micromarkExtensions', [mdxComponent()])
    .data('fromMarkdownExtensions', [mdxComponentFromMarkdown()])
    .use(remarkParse)
    .use(mdxishMdxComponentBlocks)
    .use(mdxishInlineMdxHtmlBlocks);
  const tree = processor.parse(md);
  processor.runSync(tree);
  return tree as Root;
};

describe('inline HTML with expression attributes transformation to MDX text', () => {
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
  });

  it('promotes inline Anchor with a concatenation-expression attr to mdxJsxTextElement', () => {
    // Quotes/spaces inside the braces make CommonMark reject the tag as inline
    // HTML, so the mdxComponent text tokenizer must claim it instead.
    const tree = parse("<Anchor target=\"_blank\" href={'https://' + user.docsUrl + '/x'}>Docs</Anchor>.");
    const [inline] = collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
    expect(inline).toMatchObject({
      type: 'mdxJsxTextElement',
      name: 'Anchor',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'target', value: '_blank' },
        {
          type: 'mdxJsxAttribute',
          name: 'href',
          value: { type: 'mdxJsxAttributeValueExpression', value: "'https://' + user.docsUrl + '/x'" },
        },
      ],
      children: [{ type: 'text', value: 'Docs' }],
    });
  });

  it('promotes inline Glossary with a template-literal expression attr', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const tree = parse('<Glossary term={`a${b}c`}>word</Glossary>');
    const [inline] = collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement');
    expect(inline).toMatchObject({
      type: 'mdxJsxTextElement',
      name: 'Glossary',
      attributes: [
        // eslint-disable-next-line no-template-curly-in-string
        { type: 'mdxJsxAttribute', name: 'term', value: { type: 'mdxJsxAttributeValueExpression', value: '`a${b}c`' } },
      ],
      children: [{ type: 'text', value: 'word' }],
    });
  });

  it('leaves inline Anchor without expression attrs for the CommonMark path', () => {
    // Plain `<Anchor href="x">` stays an html node so the existing inline-mdx
    // merge path (and rehype-raw) handle it — the tokenizer must not claim it.
    const tree = parse('<Anchor href="https://example.com">Link</Anchor>');
    expect(collectNodes<MdxJsxTextElement>(tree, 'mdxJsxTextElement')).toHaveLength(0);
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
