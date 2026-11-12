import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { renderFixture } from '../../lib/render-fixture';
import { collectNodes, parseMdxishWithResolvedSources } from '../helpers';

const context = { components: [], glossary: [], variables: { defaults: [], user: {} } };

// RM-19076: same-name components written on one line must remain siblings.
describe('component boundaries', () => {
  describe.each(['mdx', 'mdxish'] as const)('%s rendering', engine => {
    it.each(['', ' ', ' between '])('keeps Callouts separated by %j as siblings', separator => {
      const source = `<Callout>first</Callout>${separator}<Callout>second</Callout>`;
      const { html, error } = renderFixture(source, context, engine);
      const container = document.createElement('div');
      container.innerHTML = html;
      const callouts = container.querySelectorAll('blockquote');

      expect(error).toBeNull();
      expect(callouts).toHaveLength(2);
      expect(callouts[0].contains(callouts[1])).toBe(false);
      expect(callouts[0].textContent).toBe('first');
      expect(callouts[1].textContent).toBe('second');
    });
  });

  it('keeps 2,000 adjacent components as sibling roots', () => {
    const source = '<Callout>body</Callout>'.repeat(2000);
    const { tree } = parseMdxishWithResolvedSources(source, { safeMode: true });

    expect(tree.children).toHaveLength(2000);
    expect(collectNodes(tree, 'mdxJsxFlowElement')).toHaveLength(2000);
  });

  it('keeps a different sibling containing a same-name child separate', () => {
    const parts = [
      '<Callout>first</Callout>',
      '<Other><Callout>nested</Callout></Other>',
      '<Callout>last</Callout>',
    ];
    const { tree, sliceOf } = parseMdxishWithResolvedSources(parts.join(''));

    expect(tree.children.map(sliceOf)).toStrictEqual(parts);
  });

  describe.each([false, true])('source boundaries with safeMode=%s', safeMode => {
    it.each(['{"</Callout>"}', '`</Callout>`'])(
      'keeps tag-shaped text in suffix %s outside its component',
      suffix => {
        const first = '<Callout>first</Callout>';
        const second = '<Callout>second</Callout>';
        const { tree, sliceOf } = parseMdxishWithResolvedSources(`${first}${suffix}${second}`, { safeMode });
        const components = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');

        expect(components.map(sliceOf)).toStrictEqual([first, second]);
      },
    );

    it.each([
      '<span title="</Callout>">first</span>',
      '`</Callout>`',
      '{"</Callout>"}',
      '{"}</Callout>"}',
      '{`</Callout>`}',
      // eslint-disable-next-line no-template-curly-in-string
      '{`outer ${`</Callout>`}`}',
      '<Callout>nested</Callout>',
      'Hi <<name>>',
      'see <<glossary:term>>',
    ])('preserves the first component containing %s', body => {
      const first = `<Callout>${body}</Callout>`;
      const second = '<Callout>sibling</Callout>';
      const { tree, sliceOf } = parseMdxishWithResolvedSources(`${first}${second}`, { safeMode });

      expect(tree.children.map(sliceOf)).toStrictEqual([first, second]);
    });

    it.each(['Callout', 'Script', 'Style', 'Textarea'])(
      'preserves genuine nesting of %s components',
      tag => {
        const inner = `<${tag}>nested</${tag}>`;
        const source = `<${tag}>${inner}</${tag}>`;
        const { tree, sliceOf } = parseMdxishWithResolvedSources(source, { safeMode });
        const components = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');

        expect(components.map(sliceOf)).toStrictEqual([source, inner]);
      },
    );

    it.each([
      '<pre></Callout> literal</pre>body',
      '<script>const value="</Callout>";</script>body',
      '<!-- </Callout> -->body',
      '{"</Callout>";}',
    ])('preserves existing MDXish recovery for %s', body => {
      const source = `<Callout>${body}</Callout>`;
      const { tree, sliceOf } = parseMdxishWithResolvedSources(source, { safeMode });

      expect(tree.children.map(sliceOf)).toStrictEqual([source]);
      expect(tree.children[0]).toMatchObject({ type: 'mdxJsxFlowElement', name: 'Callout' });
    });
  });

  it.each(['', '- ', '> '])('preserves sibling source positions under prefix %j', prefix => {
    const first = '<Callout>first</Callout>';
    const second = '<Callout>second</Callout>';
    const { tree, sliceOf } = parseMdxishWithResolvedSources(`${prefix}${first}${second}`);
    const components = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');

    expect(components.map(sliceOf)).toStrictEqual([first, second]);
  });

  it.each([' ', '\t', ' between '])('excludes separator %j from component source positions', separator => {
    const first = '<Callout>first</Callout>';
    const second = '<Callout>second</Callout>';
    const { tree, sliceOf } = parseMdxishWithResolvedSources(`${first}${separator}${second}`);
    const components = collectNodes<MdxJsxFlowElement>(tree, 'mdxJsxFlowElement');

    expect(components.map(sliceOf)).toStrictEqual([first, second]);
  });
});
