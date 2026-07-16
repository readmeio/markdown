import { toHtml } from 'hast-util-to-html';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

// Markdown inside plain lowercase HTML must parse even when indented for
// readability — at top level and nested inside custom components (whose bodies are
// re-parsed). Guards HTML-flow swallowing and 4+-column indented-code fallout.
describe('markdown inside indented plain HTML blocks', () => {
  it('parses indented markdown in a <div> nested inside <Columns>/<Column>', () => {
    const md = `<Columns layout="auto">
  <Column>
    <div className="simple-list">
      ## Learn By Example

      Use the API Simulator alongside step-by-step [Guides](https://example.com/docs) and [prepared collections](https://example.com/collections) to get up and running quickly.
    </div>
  </Column>

  <Column>
    <div className="simple-list">
      ## Stay Informed

      Review [Release Notes](https://example.com/changelog) to learn about new features.
    </div>
  </Column>
</Columns>`;

    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();

    const headings = findAllElementsByTagName(ast, 'h2');
    expect(headings).toHaveLength(2);
    expect(html).toContain('Learn By Example</h2>');
    expect(html).toContain('Stay Informed</h2>');
    expect(html).toContain('<a href="https://example.com/docs">Guides</a>');

    // Headings and paragraphs re-nest inside their wrapper divs
    const wrappers = findAllElementsByTagName(ast, 'div').filter(
      el => Array.isArray(el.properties.className) && el.properties.className.includes('simple-list'),
    );
    expect(wrappers).toHaveLength(2);
    expect(findElementByTagName(wrappers[0], 'h2')).not.toBeNull();
    expect(findElementByTagName(wrappers[0], 'p')).not.toBeNull();
  });

  it('parses markdown indented 1-3 columns directly after a top-level opening tag', () => {
    const md = `<div className="simple-list">
  ## Learn By Example

  Use the [API Simulator](https://example.com) alongside guides.
</div>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'h2')).toMatchObject({
      children: [{ type: 'text', value: 'Learn By Example' }],
    });
    expect(findElementByTagName(ast, 'a')).toMatchObject({
      properties: { href: 'https://example.com' },
      children: [{ type: 'text', value: 'API Simulator' }],
    });

    const wrapper = findElementByTagName(ast, 'div');
    expect(findElementByTagName(wrapper!, 'h2')).not.toBeNull();
  });

  it('parses an indented markdown island (blank-line separated) nested inside components', () => {
    const md = `<Columns layout="auto">
  <Column>
    <div className="simple-list">

      ## Learn By Example

      Use the [API Simulator](https://example.com) alongside guides.
    </div>
  </Column>
</Columns>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'h2')).not.toBeNull();
    expect(findElementByTagName(ast, 'a')).toMatchObject({ properties: { href: 'https://example.com' } });
  });

  it('keeps deeply indented (4+ columns) HTML lines inside a wrapper as HTML (#1344)', () => {
    const md = `<div>
        <a class="glossary-letter" href="#a">A</a> |
        <a class="glossary-letter" href="#b">B</a> |
</div>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();
    expect(findAllElementsByTagName(ast, 'a')).toHaveLength(2);
  });

  it('keeps content indented 4+ columns relative to its nested wrapper as an indented code block', () => {
    // Relative indentation is preserved when component bodies are dedented, so
    // content 4+ columns deeper than the surrounding tags still parses as code.
    const md = `<Column>
  <div>

      const literal = 'code';

  </div>
</Column>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'code')).not.toBeNull();
  });

  it('does not treat deeply indented content as code when nested under unindented HTML', () => {
    const md = `<Cards>
  <Card class="card">
   <p class="Card-title">Title</p>
    Account balances, position changes, and transaction activity updated instantly for faster financial  response.<br />
  </Card>
</Cards>`;

    const ast = mdxish(md);
    const html = toHtml(ast);
    expect(html).toContain('Account balances, position changes, and transaction activity updated instantly');
    expect(findElementByTagName(ast, 'code')).toBeNull();
  });

  // A tab counts as 1 char but 4 CommonMark columns, so tab-indented bodies used to
  // slip past the dedent's column gate and fragment into indented-code blocks.
  it('does not wrap tab-indented nested HTML siblings in code blocks', () => {
    const md = [
      '<div class="top-image-text-section">',
      '\t<div class="top-text-container">',
      '\t\t<div style="font-size: 18px;"><h2>Try Akamai products for free</h2></div>',
      '\t\t<p style="font-size: 16px;"><a class="dev-center-link" href="https://example.com/trials">Create an account</a> and explore for free.</p>',
      '\t</div>',
      '\t<div class="top-image-container">',
      '\t\t<div>',
      '\t\t\t<img src="https://example.com/img.jpg">',
      '\t\t</div>',
      '\t</div>',
      '</div>',
    ].join('\n');

    const ast = mdxish(md);
    const html = toHtml(ast);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();

    // Both sibling wrappers survive rather than one collapsing into a code block.
    expect(findAllElementsByTagName(ast, 'div').filter(el =>
      Array.isArray(el.properties.className)
        ? el.properties.className.includes('top-image-container')
        : el.properties.className === 'top-image-container',
    )).toHaveLength(1);

    expect(html).toContain('Try Akamai products for free</h2>');
    expect(findElementByTagName(ast, 'a')).toMatchObject({ properties: { href: 'https://example.com/trials' } });
    expect(findElementByTagName(ast, 'img')).toMatchObject({ properties: { src: 'https://example.com/img.jpg' } });
  });

  it('dedents a tab-indented <div> body so single-tab-deep markdown still parses', () => {
    const md = ['<div className="simple-list">', '\t<h2>Learn By Example</h2>', '\t<p>Use the <a href="https://example.com">API Simulator</a>.</p>', '</div>'].join('\n');

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();
    expect(findElementByTagName(ast, 'h2')).not.toBeNull();
    expect(findElementByTagName(ast, 'a')).toMatchObject({ properties: { href: 'https://example.com' } });
  });
});
