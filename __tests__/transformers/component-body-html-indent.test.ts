import type { Html, List } from 'mdast';

import { collectNodes, parseMdxishWithSlices, roundTripMdxish } from '../helpers';

describe('component body HTML indentation (RM-19815)', () => {
  it.each([
    ['first-line comment', '<Callout icon="📘" theme="info">\n  <!-- note --> Some text\n</Callout>', '<!-- note --> Some text'],
    ['HTML after a paragraph', '<Callout>\n  Hello\n\n  <div>x</div>\n</Callout>', '<div>x</div>'],
    ['nested component', '<Tabs>\n  <Tab title="One">\n    <!-- note --> Text\n  </Tab>\n</Tabs>', '<!-- note --> Text'],
    ['component in a list', '- <Callout>\n    <!-- note --> Text\n  </Callout>', '<!-- note --> Text'],
    ['HTML in a list', '<Callout>\n  - item\n\n    <!-- note --> Text\n</Callout>', '<!-- note --> Text'],
    ['one space', '<Tab>\n <!-- note -->\n</Tab>', '<!-- note -->'],
    ['three spaces', '<Tab>\n   <!-- note -->\n</Tab>', '<!-- note -->'],
    ['opener line', '<Callout> <!-- note --> Text\n</Callout>', '<!-- note --> Text'],
  ])('normalizes %s and keeps its page position', (_name, markdown, expected) => {
    for (const newEditorTypes of [false, true]) {
      const { tree, sliceOf } = parseMdxishWithSlices(markdown, { newEditorTypes });
      const [html] = collectNodes<Html>(tree, 'html');

      expect(html?.value).toBe(expected);
      expect(sliceOf(html)).toBe(expected);
    }
  });

  it('preserves indentation inside multiline HTML', () => {
    const markdown = '<Callout>\n  <div>\n    <span>x</span>\n  </div>\n</Callout>';
    const { tree } = parseMdxishWithSlices(markdown);
    const [html] = collectNodes<Html>(tree, 'html');

    expect(html?.value).toBe('<div>\n  <span>x</span>\n</div>');
  });

  it('preserves internal HTML whitespace below the deindent gate', () => {
    const markdown = '<Callout>\n  <pre>\n  x\n  </pre>\n</Callout>';
    const { tree } = parseMdxishWithSlices(markdown);
    const [html] = collectNodes<Html>(tree, 'html');

    expect(html?.value).toBe('<pre>\n  x\n  </pre>');
  });

  it('does not normalize HTML outside the component body', () => {
    const markdown = '<Callout>Text</Callout>\n\n  <div>x</div>';
    const { tree } = parseMdxishWithSlices(markdown);
    const [html] = collectNodes<Html>(tree, 'html');

    expect(html?.value).toBe('  <div>x</div>');
  });

  it('does not accumulate indentation across saves', () => {
    const markdown = '<Callout>\n  Hello\n\n  <div>x</div>\n</Callout>\n';
    const once = roundTripMdxish(markdown);

    expect(once).toBe(markdown);
    expect(roundTripMdxish(once)).toBe(once);
  });

  it('preserves genuinely nested list items', () => {
    const markdown = '<Callout>\n  - one\n    - nested\n  - two\n\n  <!-- note --> Text\n</Callout>';
    const { tree } = parseMdxishWithSlices(markdown);
    const lists = collectNodes<List>(tree, 'list');

    expect(lists.map(list => list.children.length)).toStrictEqual([2, 1]);
  });
});
