import { toHtml } from 'hast-util-to-html';

import { mdast } from '../../../index';
import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

// Test for mdxish disabling CommonMark's indented-code construct, matching MDX
// (`micromark-extension-mdx-md`): 4+ column indentation is readability
// formatting, never code. Code requires an explicit fence.
describe('indented code blocks are disabled (CX-3739)', () => {
  it('renders a top-level 4-space-indented block as prose, not code', () => {
    const md = 'intro paragraph\n\n    const literal = 1;\n\nafter paragraph';

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();
    expect(findAllElementsByTagName(ast, 'p')).toHaveLength(3);
    expect(findAllElementsByTagName(ast, 'p')[1]).toMatchObject({
      children: [{ type: 'text', value: 'const literal = 1;' }],
    });
  });

  it('renders a tab-indented block as prose, not code', () => {
    const md = 'intro paragraph\n\n\tconst literal = 1;';

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findAllElementsByTagName(ast, 'p')[1]).toMatchObject({
      children: [{ type: 'text', value: 'const literal = 1;' }],
    });
  });

  it('still renders an explicit fence as code', () => {
    const md = 'intro paragraph\n\n```js\nconst literal = 1;\n```';

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'code')).toMatchObject({
      properties: { className: ['language-js'] },
      children: [{ type: 'text', value: 'const literal = 1;\n' }],
    });
  });

  it('still renders a fence indented as list-item continuation as code', () => {
    const md = '1. Install the CLI:\n\n    ```shell\n    npm install -g acme\n    ```';

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'li')).not.toBeNull();
    expect(findElementByTagName(ast, 'code')).toMatchObject({
      properties: { className: ['language-shell'] },
      children: [{ type: 'text', value: 'npm install -g acme\n' }],
    });
  });

  it('renders a 4+ column island inside a re-parsed component body as prose', () => {
    // Component bodies re-parse through buildInlineMdProcessor, which carries
    // its own micromark extension list — this covers that second wiring site.
    const md = `<Accordion title="Details">
  Intro line

      deeply indented line
</Accordion>`;

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    expect(findElementByTagName(ast, 'code')).toBeNull();
    expect(toHtml(ast)).toContain('deeply indented line');
  });

  it('renders an indented island inside a blockquote as prose', () => {
    const md = '> quoted intro\n>\n>     indented under quote';

    const ast = mdxish(md);

    expect(findElementByTagName(ast, 'pre')).toBeNull();
    const blockquote = findElementByTagName(ast, 'blockquote');
    expect(toHtml(blockquote!)).toContain('indented under quote');
  });

  it('matches MDX, which also parses the indented block as a paragraph', () => {
    const md = 'intro paragraph\n\n    const literal = 1;\n\nafter paragraph';

    const tree = mdast(md, { missingComponents: 'ignore' });

    expect(tree.children.map(child => child.type)).toStrictEqual(['paragraph', 'paragraph', 'paragraph']);
  });
});
