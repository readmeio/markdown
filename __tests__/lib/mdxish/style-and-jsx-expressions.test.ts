import type { Element } from 'hast';

import { toHtml } from 'hast-util-to-html';

import { describe, it, expect } from 'vitest';

import { mdxish } from '../../../lib/mdxish';

// Regression coverage for CX-3646: content authored under the MDX renderer using
// `<style>{`...`}</style>` template literals, `style={{...}}` object expressions, and
// `.map()` blocks returning JSX rendered correctly, but silently broke when force-migrated
// to mdxish. See .claude/context/MDXish for background on the processor pipeline.
describe('CX-3646: <style> blocks and JSX expressions carried over from MDX', () => {
  it('evaluates a <style>{`...`}</style> template literal into plain CSS text', () => {
    const md = `
<style>
  {\`
  .foo { color: red; }
  \`}
</style>

<div className="foo">hi</div>
`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('<style>');
    expect(html).toContain('.foo { color: red; }');
    expect(html).not.toContain('{`');
    expect(html).not.toContain('`}');
  });

  it('serializes an evaluated style={{...}} object into a CSS string, not "[object Object]"', () => {
    const md = '<div style={{ color: "red", fontSize: 12 }}>hi</div>';
    const html = toHtml(mdxish(md));

    expect(html).toContain('style="color:red;font-size:12px"');
    expect(html).not.toContain('[object Object]');
  });

  it('renders a .map() expression returning JSX instead of leaking "[object Object]" JSON', () => {
    const md = `<div>
  {[{ title: "A" }, { title: "B" }].map((item, i) => (
    <span key={i} className="card">{item.title}</span>
  ))}
</div>`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('<span class="card">A</span>');
    expect(html).toContain('<span class="card">B</span>');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('_owner');
  });

  it('renders JSX from a nested .map() whose outer level returns an array of arrays', () => {
    const md = `<div className="sections">
  {[{ items: [{ title: "A", url: "https://example.com/a" }] }, { items: [{ title: "B", url: "https://example.com/b" }] }].map((section, i) => (
    section.items.map((item, j) => (
      <a key={j} href={item.url} className="card">{item.title}</a>
    ))
  ))}
</div>`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('<a href="https://example.com/a" class="card">A</a>');
    expect(html).toContain('<a href="https://example.com/b" class="card">B</a>');
    expect(html).not.toContain('[object Object]');
  });

  it('promotes a plain wrapper <div> (no attribute expression of its own) when its .map() body returns JSX with expression attrs', () => {
    const md = `<div className="grid">
  {[{ title: "A", url: "https://example.com" }].map((item, i) => (
    <a key={i} href={item.url} className="card">{item.title}</a>
  ))}
</div>`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('<div class="grid"><a href="https://example.com" class="card">A</a></div>');
  });

  it('does not fragment a plain-attribute nested <div> block at a blank line between JSX siblings', () => {
    const md = `<div className="wrap">
  <div className="image">
    <img src="https://example.com/x.png" />
  </div>

  <div className="content">
    <h3 className="title">Title</h3>
  </div>
</div>`;
    const ast = mdxish(md);
    const html = toHtml(ast);

    // A single wrapper div, not fragmented into stray <pre>/duplicate tags.
    expect(ast.children).toHaveLength(1);
    expect((ast.children[0] as Element).tagName).toBe('div');
    expect(html).toContain('<div class="content">');
    expect(html).not.toContain('<pre>');
    expect(html).not.toContain('<code');
  });

  it('renders a .map() callback with a local const + blank line before return (ticket grid 3 shape)', () => {
    const md = `<div className="grid">
  {[
    { icon: "https://example.com/a.png", title: "A", link: "https://example.com/a" },
  ].map((item, i) => {
    const Tag = item.link ? "a" : "div";

    return (
      <Tag key={i} href={item.link} className="card">
        <img src={item.icon} alt="" className="icon" />

        <div className="content">
          <h3>{item.title}</h3>
        </div>
      </Tag>
    );
  })}
</div>`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('<a href="https://example.com/a" class="card">');
    expect(html).toContain('<h3');
    expect(html).not.toContain('<pre>');
    expect(html).not.toContain('<code');
  });

  it('serializes style={{...}} objects correctly for deeply nested elements produced by a .map()', () => {
    const md = `<div
  style={{ display: "grid" }}
>
  {[{ title: "A", url: "https://example.com" }].map((item, i) => (
    <a key={i} href={item.url} style={{ textDecoration: "none" }}>
      <div style={{ padding: "20px" }}>{item.title}</div>
    </a>
  ))}
</div>`;
    const html = toHtml(mdxish(md));

    expect(html).toContain('style="display:grid"');
    expect(html).toContain('style="text-decoration:none"');
    expect(html).toContain('style="padding:20px"');
    expect(html).not.toContain('[object Object]');
  });

  // There has been cases where an expression returns invalid HTML (e.g. <a> wrapping <a>)
  // breaking the content rendering. These tests ensure when those happen, the content is still rendered
  // correctly
  describe('renders given invalid HTML inside the expression', () => {
    it('keeps an outer <a> card wrapping inner <a> links from a nested .map()', () => {
      const md = `<div className="grid">
    {[{ title: "Card", url: "https://example.com/card", items: [{ label: "Link", url: "https://example.com/link" }] }].map((item, i) => (
      <a key={i} href={item.url} className="card-link">
        <div className="card">
          <h3>{item.title}</h3>
          <ul>
            {item.items.map((entry, idx) => (
              <li key={idx}>
                <a href={entry.url}>{entry.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </a>
    ))}
  </div>`;
      const html = toHtml(mdxish(md));
  
      expect(html).toContain(
        '<a href="https://example.com/card" class="card-link"><div class="card"><h3 id="card">Card</h3><ul><li><a href="https://example.com/link">Link</a></li></ul></div></a>',
      );
      expect(html).not.toContain('class="card-link"></a>');
    });

    it('does not clone the wrapping <a> across block children when siblings are blank-line separated', () => {
      const md = `<div className="grid">
    {[{ title: "A", url: "https://example.com/a" }].map((item, i) => (
      <a key={i} href={item.url} className="card-link">
        <div className="card">
          <img src="https://example.com/a.png" alt="" />
  
          <h3>{item.title}</h3>
  
          <ul>
            <li><a href="https://example.com/inner">inner</a></li>
          </ul>
        </div>
      </a>
    ))}
  </div>`;
      const ast = mdxish(md);
      const html = toHtml(ast);
  
      expect(html.match(/class="card-link"/g)).toHaveLength(1);
      expect(html).toContain('<a href="https://example.com/inner">inner</a>');
      expect((ast.children[0] as Element).tagName).toBe('div');
    });

    // A different content-model violation: HTML5 auto-closes a `<p>` at a block-level start tag,
    // so parse5 would hoist the `<div>` out and leave an empty `<p>` clone. Building hast directly
    // keeps the `<div>` nested inside the `<p>`, alongside the evaluated `<style>` block.
    it('keeps a block <div> nested inside a <p> returned from a .map()', () => {
      const md = `<style>{\`.note { color: teal; }\`}</style>

  <div className="notes">
    {[{ text: "Hello", detail: "World" }].map((item, i) => (
      <p key={i} className="note">
        {item.text}
        <div className="detail">{item.detail}</div>
      </p>
    ))}
  </div>`;
      const html = toHtml(mdxish(md));

      expect(html).toContain('<style>.note { color: teal; }</style>');
      expect(html).toContain('<p class="note">Hello<div class="detail">World</div></p>');
      expect(html).not.toContain('<p></p>');
    });
  });
});
