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
});
