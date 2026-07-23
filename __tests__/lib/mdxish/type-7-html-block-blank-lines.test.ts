import type { Element } from 'hast';

import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName, roundTripMdxish } from '../../helpers';

// Type-7 tags (a, span, button, …) end their HTML block at a blank line, fragmenting
// 4+ column children into indented code. The mdxComponent tokenizer claims them like
// type-6 plain blocks, but only when the opener sits alone on its line.
describe('conditional block claims for type-7 wrapper tags', () => {
  const wrapperTags = [
    'a',
    'span',
    'button',
    'strong',
    'em',
    'i',
    'label',
    'picture',
    'audio',
    'video',
    'canvas',
    'object',
    'code',
    'time',
    'mark',
  ];

  describe('block-wrapper shape stays whole across a blank line + indented children', () => {
    it.each(wrapperTags)('<%s> at top level', tag => {
      const md = `<${tag} class="card">
    <div class="inner">

    <b>Bold label</b>
    <p>Card body text</p>
    </div>
</${tag}>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      const wrapper = findElementByTagName(ast, tag);
      expect(wrapper).toMatchObject({ properties: { className: ['card'] } });
      expect(findElementByTagName(wrapper!, 'b')).toMatchObject({
        children: [{ type: 'text', value: 'Bold label' }],
      });
      expect(findElementByTagName(wrapper!, 'p')).toMatchObject({
        children: [{ type: 'text', value: 'Card body text' }],
      });
    });

    it.each(wrapperTags)('<%s> nested inside a claimed <div> (dedent leaves 4 effective columns)', tag => {
      const md = `<div class="outer">
  <${tag} class="card">
    <div class="inner">

      <b>Bold label</b>
      <p>Card body text</p>
    </div>
  </${tag}>
</div>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      const wrapper = findElementByTagName(ast, tag);
      expect(wrapper).toMatchObject({ properties: { className: ['card'] } });
      expect(findElementByTagName(wrapper!, 'p')).toMatchObject({
        children: [{ type: 'text', value: 'Card body text' }],
      });
    });
  });

  describe('formatting variants of the claimed shape', () => {
    it('survives multiple consecutive blank lines', () => {
      const md = `<a href="/x" class="card">
    <div class="inner">


    <p>body</p>
    </div>
</a>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(findElementByTagName(ast, 'a')!, 'p')).toMatchObject({
        children: [{ type: 'text', value: 'body' }],
      });
    });

    it('tolerates trailing spaces on the opener line and a whitespace-only blank line', () => {
      const md = '<a href="/x" class="card">  \n    <div class="inner">\n   \n    <p>body</p>\n    </div>\n</a>';

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(findElementByTagName(ast, 'a')!, 'p')).toMatchObject({
        children: [{ type: 'text', value: 'body' }],
      });
    });

    it('survives tab-indented children after the blank line', () => {
      const md = '<a href="/x" class="card">\n\t<div class="inner">\n\n\t<p>body</p>\n\t</div>\n</a>';

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(findElementByTagName(ast, 'a')!, 'p')).toMatchObject({
        children: [{ type: 'text', value: 'body' }],
      });
    });

    it('tracks depth through nested same-name wrappers separated by a blank line', () => {
      const md = `<span class="outer-badge">
    <span class="inner-badge">

    <b>tag</b>
    </span>
</span>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      const spans = findAllElementsByTagName(ast, 'span');
      expect(spans[0]).toMatchObject({ properties: { className: ['outer-badge'] } });
      expect(findElementByTagName(spans[0], 'b')).toMatchObject({ children: [{ type: 'text', value: 'tag' }] });
    });
  });

  describe('inline usage is not claimed', () => {
    it.each(['a', 'span', 'strong'])('a lone inline <%s> line stays a paragraph', tag => {
      const attrs = tag === 'a' ? ' href="https://example.com"' : '';
      const ast = mdxish(`<${tag}${attrs}>Example</${tag}>`);

      expect(ast.children).toHaveLength(1);
      expect((ast.children[0] as Element).tagName).toBe('p');
      expect(findElementByTagName(ast, tag)).toMatchObject({
        children: [{ type: 'text', value: 'Example' }],
      });
    });

    it('keeps a wrapper with content trailing its opener on the same line inline', () => {
      const md = `<a href="/x">some
text</a>`;

      const ast = mdxish(md);

      expect(ast.children).toHaveLength(1);
      expect((ast.children[0] as Element).tagName).toBe('p');
      expect(findElementByTagName(ast, 'a')).toMatchObject({ properties: { href: '/x' } });
    });

    it('keeps a tag inside prose inline', () => {
      const ast = mdxish('Click <button class="cta">here</button> now');

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(ast, 'button')).toMatchObject({
        children: [{ type: 'text', value: 'here' }],
      });
    });
  });

  describe('CommonMark fallbacks are preserved', () => {
    it('falls back when a blank line is followed by markdown prose', () => {
      const md = `<a class="card">

**bold island** text

</a>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'bold island' }],
      });
    });

    it('falls back cleanly when the wrapper never closes', () => {
      const md = `<a class="card">
  <p>one</p>

plain trailing text`;

      const html = toHtml(mdxish(md));

      expect(html).toContain('plain trailing text');
    });

    it('works inside a blockquote', () => {
      const md = `> <a class="card">
>   <p>one</p>
>
>   <p>two</p>
> </a>`;

      const ast = mdxish(md);
      const blockquote = findElementByTagName(ast, 'blockquote');

      expect(blockquote).not.toBeNull();
      expect(findAllElementsByTagName(blockquote!, 'p')).toHaveLength(2);
      expect(findElementByTagName(ast, 'pre')).toBeNull();
    });
  });

  describe('non-tags and owned tags never enter the conditional claim', () => {
    it('leaves a URI autolink alone', () => {
      const ast = mdxish('<https://example.com>');

      expect(findElementByTagName(ast, 'a')).toMatchObject({
        properties: { href: 'https://example.com' },
        children: [{ type: 'text', value: 'https://example.com' }],
      });
    });

    it('leaves an email autolink alone', () => {
      const ast = mdxish('<test@example.com>');

      expect(findElementByTagName(ast, 'a')).toMatchObject({
        properties: { href: 'mailto:test@example.com' },
        children: [{ type: 'text', value: 'test@example.com' }],
      });
    });

    it('leaves an unknown lowercase tag to CommonMark', () => {
      const md = `<placeholder>

body text

</placeholder>`;

      const html = toHtml(mdxish(md));

      expect(html).toContain('body text');
    });

    it('keeps raw-name tag bodies byte-exact across blank lines', () => {
      const md = `<pre>
line one

    line two
</pre>`;

      const pre = findElementByTagName(mdxish(md), 'pre');

      // The newline after `<pre>` is dropped per HTML parsing; the rest is exact.
      expect(toHtml(pre!)).toBe('<pre>line one\n\n    line two\n</pre>');
    });

    it('leaves foreign content (svg) to the blank-line collapse preprocessor', () => {
      const md = `<svg viewBox="0 0 10 10">

  <circle cx="5" cy="5" r="4" />
</svg>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(ast, 'svg')).not.toBeNull();
      expect(findElementByTagName(ast, 'circle')).not.toBeNull();
    });
  });

  describe('interactions with other constructs', () => {
    it('keeps a table inside a claimed <a> owned by the table transform', () => {
      const md = `<a href="/pricing" class="card">
  <table>
    <tr>
      <td>cell</td>
    </tr>
  </table>
</a>`;

      const html = toHtml(mdxish(md));

      expect(html).toContain('<table>');
      expect(html).toContain('cell');
      expect(html).not.toContain('<pre>');
    });

    it('does not mistake a literal closer inside a fenced code child for the real closer', () => {
      const md = `<a class="card">
  \`\`\`html
  </a>
  \`\`\`
</a>`;

      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'code')).toMatchObject({
        properties: { className: ['language-html'] },
        children: [{ type: 'text', value: '</a>\n' }],
      });
    });

    it('allows blank lines inside a brace expression child', () => {
      const md = `<a className="grid">
  {[1, 2].map(item => {
    const doubled = item * 2;

    return <span key={item}>{doubled}</span>;
  })}
</a>`;

      const html = toHtml(mdxish(md));

      expect(html).toContain('<span>2</span>');
      expect(html).toContain('<span>4</span>');
      expect(html).not.toContain('<pre>');
    });

    it('parses prose on the line directly after the closer as a paragraph', () => {
      // Deliberate delta from CommonMark type-7, which swallows this prose into
      // the raw html block; the claim ends at the closer so it parses as markdown.
      const md = `<span class="badge">
  <b>New</b>
</span>
After **bold** text`;

      const ast = mdxish(md);

      expect(findElementByTagName(findElementByTagName(ast, 'span')!, 'b')).toMatchObject({
        children: [{ type: 'text', value: 'New' }],
      });
      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'bold' }],
      });
    });

    it('splices trailing content on the closer line into siblings when the body promotes', () => {
      // The markdown rides inside an html line: a bare markdown line after the opener
      // would be split off by terminateHtmlFlowBlocks before the tokenizer runs.
      const md = `<a href="/x" class="card">
  <div>**Card title**</div>
</a> and **bold** after`;

      const ast = mdxish(md);

      const anchor = findElementByTagName(ast, 'a');
      expect(anchor).toMatchObject({ properties: { href: '/x' } });
      expect(findElementByTagName(anchor!, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'Card title' }],
      });
      const strongs = findAllElementsByTagName(ast, 'strong');
      expect(strongs[1]).toMatchObject({ children: [{ type: 'text', value: 'bold' }] });
    });

    it('keeps an html-only body raw with its closer-line trailing text, like plain <div> claims', () => {
      const md = `<a href="/x" class="card">
  <div>x</div>
</a> and trailing text`;

      const html = toHtml(mdxish(md));

      expect(html).toContain('<a href="/x" class="card">');
      expect(html).toContain('and trailing text');
    });
  });

  describe('round-trips through mdxishMdastToMd', () => {
    it('preserves a claimed wrapper with a blank line', () => {
      const md = `<a href="/x" class="card">
    <div class="inner">

    <p>body</p>
    </div>
</a>`;

      const roundTripped = roundTripMdxish(md);

      // The island survives serialization whole: no indented-code fragments.
      expect(roundTripped).toContain('<a href="/x" class="card">');
      expect(roundTripped).toContain('</a>');
      expect(roundTripped).not.toContain('    <p>body</p>\n\n');
      expect(mdxish(roundTripped) && findElementByTagName(mdxish(roundTripped), 'pre')).toBeNull();
    });
  });
});
