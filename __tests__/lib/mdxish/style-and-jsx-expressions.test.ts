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
    const html = toHtml(mdxish(md) as never);

    expect(html).toContain('<style>');
    expect(html).toContain('.foo { color: red; }');
    expect(html).not.toContain('{`');
    expect(html).not.toContain('`}');
  });

  it('serializes an evaluated style={{...}} object into a CSS string, not "[object Object]"', () => {
    const md = '<div style={{ color: "red", fontSize: 12 }}>hi</div>';
    const html = toHtml(mdxish(md) as never);

    expect(html).toContain('style="color:red;font-size:12px"');
    expect(html).not.toContain('[object Object]');
  });

  it('renders a .map() expression returning JSX instead of leaking "[object Object]" JSON', () => {
    const md = `<div>
  {[{ title: "A" }, { title: "B" }].map((item, i) => (
    <span key={i} className="card">{item.title}</span>
  ))}
</div>`;
    const html = toHtml(mdxish(md) as never);

    expect(html).toContain('<span class="card">A</span>');
    expect(html).toContain('<span class="card">B</span>');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('_owner');
  });

  it('promotes a plain wrapper <div> (no attribute expression of its own) when its .map() body returns JSX with expression attrs', () => {
    const md = `<div className="grid">
  {[{ title: "A", url: "https://example.com" }].map((item, i) => (
    <a key={i} href={item.url} className="card">{item.title}</a>
  ))}
</div>`;
    const html = toHtml(mdxish(md) as never);

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
    const html = toHtml(ast as never);

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
    const html = toHtml(mdxish(md) as never);

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
    const html = toHtml(mdxish(md) as never);

    expect(html).toContain('style="display:grid"');
    expect(html).toContain('style="text-decoration:none"');
    expect(html).toContain('style="padding:20px"');
    expect(html).not.toContain('[object Object]');
  });
});
