import type { Element } from 'hast';

import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

// The mdxComponent flow tokenizer claims plain lowercase block tags (no `{…}`
// attribute needed) so blank lines between nested JSX siblings don't fragment
// the block. A blank line may only be followed by another tag line — anything
// else falls back to CommonMark html-flow, preserving markdown islands.
describe('plain HTML block tags with nested blank lines', () => {
  it('keeps a wrapper <div> whole across a blank line between sibling tags', () => {
    const md = `<div className="wrap">
  <div className="a">
    <p>one</p>
  </div>

  <div className="b">
    <p>two</p>
  </div>
</div>`;

    const ast = mdxish(md);

    expect(ast.children).toHaveLength(1);
    expect((ast.children[0] as Element).tagName).toBe('div');
    expect(findElementByTagName(ast, 'pre')).toBeNull();
    const inner = findAllElementsByTagName(ast, 'div').filter(
      el => Array.isArray(el.properties.className) && ['a', 'b'].includes(String(el.properties.className[0])),
    );
    expect(inner).toHaveLength(2);
  });

  it('does not fragment indented sibling content into code blocks', () => {
    const md = `<div class="solution">
    <img src="https://example.com/pic.png" />

    <div class="solution-content">
        Some solution text here.
    </div>
</div>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();
    const [outer, inner] = findAllElementsByTagName(ast, 'div');
    expect(outer).toMatchObject({ properties: { className: ['solution'] } });
    expect(inner).toMatchObject({ properties: { className: ['solution-content'] } });
    expect(findElementByTagName(outer, 'img')).not.toBeNull();
  });

  it('treats a whitespace-only line as blank (still guarded, still claimable before a tag line)', () => {
    const md = '<div className="wrap">\n  <p>one</p>\n   \n  <p>two</p>\n</div>';

    const ast = mdxish(md);

    expect(ast.children).toHaveLength(1);
    expect(findAllElementsByTagName(ast, 'p')).toHaveLength(2);
  });

  it('preserves a markdown island: blank line followed by non-tag content falls back to CommonMark', () => {
    const md = `<div className="wrap">

**bold island**

</div>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'strong')).toMatchObject({
      children: [{ type: 'text', value: 'bold island' }],
    });
  });

  it('falls back for a paragraph that opens with an inline tag then trails into markdown', () => {
    // Opens with `<b>` but trails into prose, so it is a paragraph, not a markup
    // continuation: it must fall back so `*this*` and the link parse.
    const md = `<div className="callout">
  <p>a</p>

<b>Note:</b> read *this* carefully and see [the docs](https://example.com)

  <p>b</p>
</div>`;

    const ast = mdxish(md);
    const wrapper = findElementByTagName(ast, 'div');

    expect(findElementByTagName(ast, 'em')).toMatchObject({ children: [{ type: 'text', value: 'this' }] });
    expect(findElementByTagName(ast, 'a')).toMatchObject({
      properties: { href: 'https://example.com' },
      children: [{ type: 'text', value: 'the docs' }],
    });
    // Both siblings plus the recovered paragraph all re-nest into the wrapper.
    expect(findAllElementsByTagName(wrapper!, 'p')).toHaveLength(3);
  });

  it('falls back when the trailing paragraph opens with an attribute-carrying tag', () => {
    const md = `<div className="wrap">
  <p>x</p>

<a href="https://ex.com">link</a> then some **bold** text

</div>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'strong')).toMatchObject({ children: [{ type: 'text', value: 'bold' }] });
    expect(findElementByTagName(ast, 'div')).not.toBeNull();
  });

  it('falls back for a trailing-markdown paragraph inside a blockquoted wrapper', () => {
    const md = `> <div className="quote">
>   <p>a</p>
>
> <b>hi</b> and *there*
> </div>`;

    const ast = mdxish(md);
    const blockquote = findElementByTagName(ast, 'blockquote');

    expect(blockquote).not.toBeNull();
    expect(findElementByTagName(blockquote!, 'em')).toMatchObject({ children: [{ type: 'text', value: 'there' }] });
  });

  it('preserves a magic block island inside an open <div>', () => {
    const md = `<div>

[block:callout]
{
  "type": "info",
  "body": "hello"
}
[/block]

</div>`;

    const html = toHtml(mdxish(md));

    expect(html).toContain('<Callout');
    expect(html).toContain('hello');
    expect(html).not.toContain('[block:callout]');
  });

  it('preserves a fenced code island inside an open <div>', () => {
    const md = `<div className="example">

\`\`\`js
const x = 1;
\`\`\`

</div>`;

    const ast = mdxish(md);

    const code = findElementByTagName(ast, 'code');
    expect(code).not.toBeNull();
    expect(toHtml(ast)).toContain('const x = 1;');
  });

  it('claims a nested wrapper so a 4+ column markdown island parses, not fragments (RM-17560)', () => {
    // 6-col nesting indent would let CommonMark swallow the island as indented code;
    // being nested (prior body content), the block is claimed and its body re-parsed.
    const md = `<ol>
  <li>
    <details>
      <summary>x</summary>

      ### Heading

      \`\`\`js
      const x = 1;
      \`\`\`
    </details>
  </li>
</ol>`;

    const ast = mdxish(md);

    // The heading and code parse; the closing tag never leaks into the code.
    expect(findElementByTagName(ast, 'h3')).toMatchObject({ children: [{ type: 'text', value: 'Heading' }] });
    const code = findElementByTagName(findElementByTagName(ast, 'details')!, 'code');
    expect(code).not.toBeNull();
    expect(toHtml(ast)).toContain('const x = 1;');
    expect(toHtml(ast)).not.toContain('&#x3C;/details>');
  });

  it('allows blank lines inside a brace expression body (e.g. a .map() callback)', () => {
    const md = `<div className="grid">
  {[1, 2].map((item, i) => {
    const doubled = item * 2;

    return <span key={i}>{doubled}</span>;
  })}
</div>`;

    const html = toHtml(mdxish(md));

    expect(html).toContain('<span>2</span>');
    expect(html).toContain('<span>4</span>');
    expect(html).not.toContain('<pre>');
  });

  it('claims a wrapper whose opening tag shares its line with other content', () => {
    const md = `<div className="wrap"><span>a</span>

<span>b</span></div>`;

    const ast = mdxish(md);

    expect(ast.children).toHaveLength(1);
    expect(findAllElementsByTagName(ast, 'span')).toHaveLength(2);
  });

  it('leaves blank lines inside table structural tags to mdxishTables', () => {
    const md = `<table>
<tr>
<td>

<p>cell</p>

</td>
</tr>
</table>`;

    const html = toHtml(mdxish(md));

    expect(html).toContain('cell');
    expect(html).toContain('<table>');
  });

  it('preserves blank lines inside <HTMLBlock> payloads byte-for-byte', () => {
    const md = `<div>

<HTMLBlock>{\`
<span>one</span>

<span>two</span>
\`}</HTMLBlock>

</div>`;

    const ast = mdxish(md);

    const htmlBlock = findElementByTagName(ast, 'html-block');
    expect(htmlBlock).toMatchObject({
      properties: { html: '<span>one</span>\n\n<span>two</span>' },
    });
  });

  it('works inside a blockquote', () => {
    const md = `> <div className="quote">
>   <p>one</p>
>
>   <p>two</p>
> </div>`;

    const ast = mdxish(md);

    const blockquote = findElementByTagName(ast, 'blockquote');
    expect(blockquote).not.toBeNull();
    expect(findAllElementsByTagName(blockquote!, 'p')).toHaveLength(2);
    expect(findElementByTagName(ast, 'pre')).toBeNull();
  });

  it('tracks depth through a nested same-name tag whose opening tag spans multiple lines', () => {
    // Prettier-style JSX: newline directly after the nested tag name. The claim
    // must end at the OUTER closer, not truncate at the inner `</div>` (which
    // previously left an unbalanced expression that threw on re-parse).
    const md = `<div>
  <div
    style={{
      display: "grid",
    }}
  >
    {[{ title: "A", url: "https://example.com" }].map((item, i) => (
      <a key={i} href={item.url}>
        {item.title}
      </a>
    ))}
  </div>
</div>

## after heading`;

    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(html).toContain('style="display:grid"');
    expect(html).toContain('<a href="https://example.com">');
    expect(findElementByTagName(ast, 'h2')).toMatchObject({
      children: [{ type: 'text', value: 'after heading' }],
    });
  });

  it('falls back cleanly when the wrapper tag never closes', () => {
    const md = `<div className="wrap">
  <p>one</p>

plain trailing text`;

    const html = toHtml(mdxish(md));

    expect(html).toContain('plain trailing text');
  });
});
