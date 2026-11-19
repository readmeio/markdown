import type { MdxishOpts } from '../../../lib/mdxish';
import type { Html } from 'mdast';

import { collectNodes, parseMdxishWithSlices, roundTripMdxish } from '../../helpers';

/** Each html node's value with its source slice, which should start at the `<`. */
const htmlNodes = (doc: string, opts: MdxishOpts) => {
  const { tree, sliceOf } = parseMdxishWithSlices(doc, opts);
  return collectNodes<Html>(tree, 'html').map(node => ({ value: node.value, slice: sliceOf(node) }));
};

// RM-19815: html in a component body kept the body indent in its value, which the editor shows verbatim.
describe.each([
  ['renderer', {}],
  ['editor', { newEditorTypes: true }],
] satisfies [string, MdxishOpts][])('html in a component body (%s)', (_mode, opts) => {
  it('drops the indent from an html line that opens the body', () => {
    const md = '<Callout icon="📘" theme="info">\n  <!-- note --> Some text\n</Callout>';

    expect(htmlNodes(md, opts)).toStrictEqual([{ value: '<!-- note --> Some text', slice: '<!-- note --> Some text' }]);
  });

  it('drops the indent from an html line after a paragraph', () => {
    const md = '<Callout icon="📘" theme="info">\n  Hello\n\n  <div>x</div>\n</Callout>';

    expect(htmlNodes(md, opts)).toStrictEqual([{ value: '<div>x</div>', slice: '<div>x</div>' }]);
  });

  // Kept under 4 columns, which would de-indent the whole body first.
  it('drops only the body indent from later lines, keeping deeper ones', () => {
    const md =
      '<Callout icon="📘" theme="info">\n  Hi\n\n  <style>\n  .a {\n   color: red;\n  }\n  </style>\n</Callout>';

    expect(htmlNodes(md, opts)).toStrictEqual([
      {
        value: '<style>\n.a {\n color: red;\n}\n</style>',
        slice: '<style>\n  .a {\n   color: red;\n  }\n  </style>',
      },
    ]);
  });

  it('keeps later lines as authored when one sits shallower than the first', () => {
    const md = '<Callout icon="📘" theme="info">\n  Hi\n\n  <pre>\nfoo\n  bar\n  </pre>\n</Callout>';

    expect(htmlNodes(md, opts)).toStrictEqual([
      { value: '<pre>\nfoo\n  bar\n  </pre>', slice: '<pre>\nfoo\n  bar\n  </pre>' },
    ]);
  });

  it('strips by columns, so a tab keeps its remaining width', () => {
    const md = '<Callout icon="📘" theme="info">\n  Hi\n\n  <pre>\n\tx\n  </pre>\n</Callout>';

    expect(htmlNodes(md, opts)).toStrictEqual([{ value: '<pre>\n  x\n</pre>', slice: '<pre>\n\tx\n  </pre>' }]);
  });

  it('drops the indent in a nested component body', () => {
    const md = '<Tabs>\n  <Tab title="A">\n    <!-- c --> hi\n  </Tab>\n</Tabs>';

    expect(htmlNodes(md, opts)).toStrictEqual([{ value: '<!-- c --> hi', slice: '<!-- c --> hi' }]);
  });

  it.each([
    ['tab-indented', '\tHello\n\n\t  <div>x</div>'],
    ['space-then-tab', ' \t<div>\n  x\n </div>'],
  ])('starts the node at the `<` when a %s body was de-indented', (_name, body) => {
    const [node] = htmlNodes(`<Callout icon="📘" theme="info">\n${body}\n</Callout>`, opts);

    expect(node.slice?.startsWith('<div>')).toBe(true);
  });

  it('matches the shape of the same html in a list item', () => {
    const inList = htmlNodes('- item\n\n  <div>x</div>', opts);
    const inBody = htmlNodes('<Callout icon="📘" theme="info">\n  item\n\n  <div>x</div>\n</Callout>', opts);

    expect(inBody).toStrictEqual(inList);
  });

  it.each([
    ['a line after a paragraph', '<Callout icon="📘" theme="info">\n  Hello\n\n  <div>x</div>\n</Callout>\n'],
    [
      'a multi-line block',
      '<Callout icon="📘" theme="info">\n  Hi\n\n  <style>\n  .a { color: red; }\n  </style>\n</Callout>\n',
    ],
  ])('round-trips %s at the body indent', (_name, md) => {
    expect(roundTripMdxish(md, opts)).toBe(md);
  });
});
