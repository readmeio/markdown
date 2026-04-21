import type { MdxJsx } from '../../../types';
import type { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';
import type { State } from 'mdast-util-to-hast';

import { NodeTypes } from '../../../enums';
import { mdxComponentHandlers } from '../../../processor/plugin/mdxish-handlers';

type Attr = MdxJsxAttribute | MdxJsxExpressionAttribute;

// Handlers only touch state.all(); the rest of State is unused, so a minimal
// stub covers every test without per-case setup.
const state = { all: () => [] } as unknown as State;

const expr = (name: string, value: string): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value: { type: 'mdxJsxAttributeValueExpression', value },
});

const runJsx = (attributes: Attr[], name = 'C'): MdxJsx =>
  mdxComponentHandlers.mdxJsxFlowElement!(
    state,
    { type: 'mdxJsxFlowElement', name, attributes, children: [] },
    undefined,
  ) as MdxJsx;

describe('mdxJsxElementHandler', () => {
  it('emits an mdx-jsx node with tagName and string properties', () => {
    const node = runJsx([{ type: 'mdxJsxAttribute', name: 'foo', value: 'bar' }], 'MyComp');
    expect(node.type).toBe('mdx-jsx');
    expect(node.tagName).toBe('MyComp');
    expect(node.properties).toStrictEqual({ foo: 'bar' });
  });

  it('reuses the same handler for flow and text variants', () => {
    expect(mdxComponentHandlers.mdxJsxFlowElement).toBe(mdxComponentHandlers.mdxJsxTextElement);
  });

  it('treats null-valued attributes as boolean true', () => {
    const node = runJsx([{ type: 'mdxJsxAttribute', name: 'disabled', value: null }]);
    expect(node.properties).toStrictEqual({ disabled: true });
  });

  it('decodes HTML entities in string attribute values', () => {
    const raw = 'a &amp; b &lt;c&gt; &quot;d&quot;&#10;e';
    const node = runJsx([{ type: 'mdxJsxAttribute', name: 'label', value: raw }]);
    expect(node.properties.label).toBe('a & b <c> "d"\ne');
  });

  it('skips spread-style expression attributes (no name)', () => {
    const node = runJsx([
      { type: 'mdxJsxExpressionAttribute', value: '...rest' },
      { type: 'mdxJsxAttribute', name: 'keep', value: 'yes' },
    ]);
    expect(node.properties).toStrictEqual({ keep: 'yes' });
  });

  it('evaluates primitive, object, and array expression attributes', () => {
    const node = runJsx([expr('count', '42'), expr('style', '{ color: "red" }'), expr('items', '[1, 2]')]);
    expect(node.properties).toStrictEqual({ count: 42, style: { color: 'red' }, items: [1, 2] });
  });

  it('falls back to the raw source when expression evaluation throws', () => {
    const node = runJsx([expr('broken', 'not(( valid')]);
    expect(node.properties.broken).toBe('not(( valid');
  });
});

// rehypeRaw's passThrough deep-clones mdx-jsx nodes with structuredClone.
// Non-serializable attribute values must fall back to the raw source, or the
// clone would throw and crash the pipeline.
describe('structuredClone guard', () => {
  it('falls back to source for function expressions', () => {
    const node = runJsx([expr('onClick', '() => console.log("hi")')]);
    expect(node.properties.onClick).toBe('() => console.log("hi")');
  });

  it('falls back when any nested value is non-cloneable', () => {
    const src = '{ onClick: () => {}, label: "go" }';
    const node = runJsx([expr('handlers', src)]);
    expect(node.properties.handlers).toBe(src);
  });

  it('produces an mdx-jsx node that is itself structuredClone-safe', () => {
    const node = runJsx([
      expr('onClick', '() => {}'),
      expr('count', '42'),
      { type: 'mdxJsxAttribute', name: 'label', value: 'Go' },
    ]);
    expect(() => structuredClone(node)).not.toThrow();
  });
});

describe('expression + esm handlers', () => {
  it('converts mdxFlowExpression / mdxTextExpression to text nodes', () => {
    const flow = mdxComponentHandlers.mdxFlowExpression!(state, { type: 'mdxFlowExpression', value: 'a' }, undefined);
    const text = mdxComponentHandlers.mdxTextExpression!(state, { type: 'mdxTextExpression', value: 'b' }, undefined);
    expect(flow).toStrictEqual({ type: 'text', value: 'a' });
    expect(text).toStrictEqual({ type: 'text', value: 'b' });
  });

  it('emits empty text when the expression value is missing', () => {
    const result = mdxComponentHandlers.mdxFlowExpression!(state, { type: 'mdxFlowExpression' }, undefined);
    expect(result).toStrictEqual({ type: 'text', value: '' });
  });

  it('drops mdxjsEsm by returning undefined', () => {
    expect(mdxComponentHandlers.mdxjsEsm!(state, { type: 'mdxjsEsm', value: '' }, undefined)).toBeUndefined();
  });
});

describe('htmlBlockHandler', () => {
  it('forwards hProperties onto an html-block element', () => {
    const result = mdxComponentHandlers[NodeTypes.htmlBlock]!(
      state,
      { type: NodeTypes.htmlBlock, data: { hName: 'html-block', hProperties: { html: '<p>hi</p>' } }, children: [] },
      undefined,
    );
    expect(result).toStrictEqual({
      type: 'element', tagName: 'html-block', properties: { html: '<p>hi</p>' }, children: [],
    });
  });
});

describe('embedHandler', () => {
  it('renders magic-block embeds as <Embed> with no children', () => {
    const result = mdxComponentHandlers.embed!(
      state,
      { type: 'embed', data: { hName: NodeTypes.embedBlock, hProperties: { url: 'https://x.com' } } },
      undefined,
    );
    expect(result).toMatchObject({ tagName: 'Embed', properties: { url: 'https://x.com' }, children: [] });
  });

  it('renders inline embeds as <embed>, populating children via state.all', () => {
    const localState = { all: () => [{ type: 'text', value: 'c' }] } as unknown as State;
    const result = mdxComponentHandlers.embed!(
      localState,
      { type: 'embed', data: { hProperties: { href: 'https://x.com' } } },
      undefined,
    );
    expect(result).toMatchObject({ tagName: 'embed', children: [{ type: 'text', value: 'c' }] });
  });
});
