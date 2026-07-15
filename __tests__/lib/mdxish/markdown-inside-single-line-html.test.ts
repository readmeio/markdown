import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../../lib';
import { collectNodes, findAllElementsByTagName, findElementByTagName, parseMdxish } from '../../helpers';

// Markdown sharing a line with its wrapping HTML tag (`<div>**bold**</div>`) is
// swallowed into a single raw html flow node, so `terminateHtmlFlowBlocks` can't
// split it. The mdx-blocks transformer re-parses and promotes these wrappers.
describe('markdown inside single-line plain HTML tags', () => {
  it('parses emphasis inside a single-line <div>', () => {
    const ast = mdxish('<div>**bold**</div>');
    const html = toHtml(ast);

    expect(findElementByTagName(ast, 'div')).toMatchObject({
      tagName: 'div',
      children: [{ tagName: 'strong', children: [{ type: 'text', value: 'bold' }] }],
    });
    expect(html).not.toContain('**');
  });

  it('preserves plain HTML attributes on the promoted wrapper', () => {
    const ast = mdxish('<div class="card-title">**a**</div>');
    const html = toHtml(ast);

    expect(findElementByTagName(ast, 'strong')).not.toBeNull();
    expect(html).toContain('class="card-title"');
  });

  it('parses markdown around a nested inline tag', () => {
    const ast = mdxish('<div>**a** <span>_b_</span></div>');

    expect(findElementByTagName(ast, 'strong')).toMatchObject({
      children: [{ type: 'text', value: 'a' }],
    });
    const span = findElementByTagName(ast, 'span');
    expect(span).not.toBeNull();
    expect(findElementByTagName(span!, 'em')).toMatchObject({
      children: [{ type: 'text', value: 'b' }],
    });
  });

  it('parses markdown in single-line headings and list items', () => {
    const ast = mdxish('<h3>_Card Title_</h3>');
    const heading = findElementByTagName(ast, 'h3');

    expect(heading).not.toBeNull();
    expect(findElementByTagName(heading!, 'em')).toMatchObject({
      children: [{ type: 'text', value: 'Card Title' }],
    });
  });

  it('parses each sibling wrapper independently', () => {
    const ast = mdxish('<div>**a**</div><div>**b**</div>');

    const strongs = findAllElementsByTagName(ast, 'strong');
    expect(strongs).toHaveLength(2);
    expect(findAllElementsByTagName(ast, 'div')).toHaveLength(2);
  });

  it('parses markdown when the closing tag sits on a later glued line', () => {
    const ast = mdxish('<div>**bold**\nmore</div>');

    expect(findElementByTagName(ast, 'strong')).toMatchObject({
      children: [{ type: 'text', value: 'bold' }],
    });
    expect(toHtml(ast)).toContain('more');
  });

  it('parses markdown inside a single-line tag nested in a component body', () => {
    const md = `<Card>
  <p class="card-title">**Fast** setup</p>
</Card>`;
    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'strong')).toMatchObject({
      children: [{ type: 'text', value: 'Fast' }],
    });
  });

  describe('non-promotion (unchanged behavior)', () => {
    it('keeps plain HTML without markdown as raw html', () => {
      const md = '<div>hello <span>x</span></div>';

      expect(toHtml(mdxish(md))).toBe(toHtml(mdxish(`${md}\n`)));
      expect(findElementByTagName(mdxish(md), 'div')).toMatchObject({
        children: [
          { type: 'text', value: 'hello ' },
          { tagName: 'span', children: [{ type: 'text', value: 'x' }] },
        ],
      });
    });

    it('keeps raw-content tag bodies literal', () => {
      const preHtml = toHtml(mdxish('<pre>**x**</pre>'));
      expect(preHtml).toContain('**x**');

      const scriptHtml = toHtml(mdxish('<script>var a = 1;</script>'));
      expect(scriptHtml).toContain('var a = 1;');
    });

    it('keeps single-line tables owned by the table transformer', () => {
      const ast = mdxish('<table><tr><td>**x**</td></tr></table>');

      expect(findElementByTagName(ast, 'table')).not.toBeNull();
      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'x' }],
      });
    });

    it('does not promote a wrapper holding a nested table', () => {
      const ast = mdxish('<div><table><tr><td>**x**</td></tr></table></div>');

      expect(findElementByTagName(ast, 'table')).not.toBeNull();
      expect(findElementByTagName(ast, 'strong')).not.toBeNull();
    });

    it('keeps HTMLBlock content literal', () => {
      const md = '<HTMLBlock>{`<div>**bold**</div>`}</HTMLBlock>';
      const html = toHtml(mdxish(md));

      expect(html).toContain('**bold**');
      expect(html).not.toContain('<strong>');
    });

    it('leaves an unclosed tag literal', () => {
      const html = toHtml(mdxish('<div>**bold**'));

      expect(html).toContain('**bold**');
    });

    it('leaves a stray unbalanced brace literal instead of throwing', () => {
      expect(() => mdxish('<div>**a** {foo </div>')).not.toThrow();
      expect(toHtml(mdxish('<div>{foo </div>'))).toContain('{foo');
    });
  });

  describe('safe mode', () => {
    it('parses emphasis while keeping braces literal', () => {
      const ast = mdxish('<div>**a** {1+1}</div>', { safeMode: true });
      const html = toHtml(ast);

      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'a' }],
      });
      expect(html).toContain('{1+1}');
    });
  });

  describe('formatting variants', () => {
    it('parses with 1-3 leading spaces before the tag', () => {
      const ast = mdxish('   <div>**bold**</div>');

      expect(findElementByTagName(ast, 'pre')).toBeNull();
      expect(findElementByTagName(ast, 'strong')).not.toBeNull();
    });

    it('parses with trailing whitespace after the closing tag', () => {
      const ast = mdxish('<div>**bold**</div>   ');

      expect(findElementByTagName(ast, 'strong')).not.toBeNull();
    });
  });

  describe('inside ReadMe components', () => {
    it('parses markdown in a single-line <div> inside a callout', () => {
      const md = `<Callout icon="📘" theme="info">
<div>**bold** in callout</div>
</Callout>`;
      const ast = mdxish(md);

      const callout = findElementByTagName(ast, 'div');
      expect(callout).not.toBeNull();
      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'bold' }],
      });
    });

    it('parses markdown in a single-line <p> title inside a Card', () => {
      const md = `<Cards>
<Card title="Title">
<p class="card-title">**Fast** setup</p>
</Card>
</Cards>`;
      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'Fast' }],
      });
      expect(toHtml(ast)).toContain('class="card-title"');
    });

    it('parses markdown in a single-line <div> inside a Column', () => {
      const md = `<Columns>
<Column>
<div>**bold** in col</div>
</Column>
</Columns>`;
      const ast = mdxish(md);

      expect(findElementByTagName(ast, 'strong')).toMatchObject({
        children: [{ type: 'text', value: 'bold' }],
      });
    });

    it('parses markdown in a single-line wrapper inside a custom component', () => {
      // Custom components without a definition are dropped from the rendered
      // hast, so assert on the promoted mdast instead.
      const tree = parseMdxish('<CustomThing><div>**bold**</div></CustomThing>');

      expect(collectNodes(tree, 'strong')).toMatchObject([
        { children: [{ type: 'text', value: 'bold' }] },
      ]);
    });
  });
});
