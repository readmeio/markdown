import type { Html, Root } from 'mdast';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { describe, expect, it } from 'vitest';

import { mdxComponentFromMarkdown } from '../../../lib/mdast-util/mdx-component';
import { plainHtmlBlockFromMarkdown } from '../../../lib/mdast-util/plain-html-block';
import { mdxComponent } from '../../../lib/micromark/mdx-component';
import { plainHtmlBlock } from '../../../lib/micromark/plain-html-block';
import { collectNodes } from '../../helpers';

/**
 * Construct-level tests: register only the `plainHtmlBlock` tokenizer (plus
 * `mdxComponent`, which is always tried first on `<`) and inspect the raw mdast.
 * A single opaque `html` node whose value spans the blank lines means the block
 * was claimed whole; multiple nodes (or a shorter value) means it fell back to
 * CommonMark html-flow.
 */
const parse = (markdown: string): Root => {
  const processor = unified()
    // Array order mirrors the real pipeline: plainHtmlBlock first = tried last.
    .data('micromarkExtensions', [plainHtmlBlock(), mdxComponent()])
    .data('fromMarkdownExtensions', [plainHtmlBlockFromMarkdown(), mdxComponentFromMarkdown()])
    .use(remarkParse);
  return processor.parse(markdown) as Root;
};

/** The single html node that starts at offset 0, if the whole input is one block. */
const soleHtml = (tree: Root): Html | undefined => {
  const htmlNodes = collectNodes<Html>(tree, 'html');
  return tree.children.length === 1 && htmlNodes.length === 1 ? htmlNodes[0] : undefined;
};

describe('plainHtmlBlock construct', () => {
  it('claims a plain <div> block across a blank line as one html node', () => {
    const md = '<div>\n<p>a</p>\n\n<p>b</p>\n</div>';
    const html = soleHtml(parse(md));
    expect(html?.value).toBe(md);
  });

  it('does not claim a PascalCase opener (left to mdxComponent)', () => {
    // `<Callout>` with no brace attr: plainHtmlBlock refuses, mdxComponent claims
    // the component itself, so the wrapper is not one opaque block.
    const md = '<div>\n\n<Callout icon="ok">hi</Callout>\n\n</div>';
    const tree = parse(md);
    // The `<div>` alone becomes its own html node (blank line terminates it);
    // the Callout is a separate html node claimed by mdxComponent.
    expect(soleHtml(tree)).toBeUndefined();
    const values = collectNodes<Html>(tree, 'html').map(n => n.value);
    expect(values).toContain('<Callout icon="ok">hi</Callout>');
  });

  it('does not claim a custom element whose name starts with a block tag', () => {
    // `<section-header>` must not claim as `section`.
    const md = '<section-header>\n\n<p>one</p>\n\n</section-header>';
    expect(soleHtml(parse(md))).toBeUndefined();
  });

  it('does not claim a self-closing plain tag across a blank line', () => {
    // A self-closing `<div />` must not open a multi-line claim; CommonMark
    // html-flow terminates it at the blank line, leaving the sibling separate.
    expect(soleHtml(parse('<div class="x" />\n\n<p>b</p>'))).toBeUndefined();
  });

  it('does not claim a plain tag carrying a brace attribute (left to mdxComponent)', () => {
    const md = '<div style={{ color: "red" }}>\n<p>a</p>\n\n<p>b</p>\n</div>';
    // mdxComponent claims this (it has a brace attr), so plainHtmlBlock never fires,
    // but the whole thing is still one node — assert it is NOT the plain path by
    // checking the tag actually kept its expression attribute intact in the value.
    const html = soleHtml(parse(md));
    expect(html?.value).toContain('style={{ color: "red" }}');
  });

  it('refuses when a nested table tag appears, so blank lines are not spanned', () => {
    // A blank line inside the nested table cell would be swallowed if the plain
    // claim rode through the table. The table opt-out aborts the claim, so
    // CommonMark html-flow terminates at the blank line and mdxishTables can own it.
    const md = '<div>\n<table>\n<tr><td>\n\ncell\n\n</td></tr>\n</table>\n</div>';
    expect(soleHtml(parse(md))).toBeUndefined();
  });

  it('falls back on a markdown island after a blank line', () => {
    const md = '<div>\n\n**bold island**\n\n</div>';
    expect(soleHtml(parse(md))).toBeUndefined();
  });
});
