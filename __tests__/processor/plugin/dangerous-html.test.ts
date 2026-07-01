/* eslint-disable no-script-url -- the `javascript:`/`vbscript:` URLs are intentional XSS fixtures */
import type { Element, Root } from 'hast';
import type { MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx';

import { stripDangerousHtml } from '../../../processor/plugin/dangerous-html';

const root = (...children: Root['children']): Root => ({ type: 'root', children });

const el = (tagName: string, properties: Element['properties'] = {}, children: Element['children'] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const jsx = (name: string | null, attributes: MdxJsxFlowElementHast['attributes'] = []): MdxJsxFlowElementHast => ({
  type: 'mdxJsxFlowElement',
  name,
  attributes,
  children: [],
});

describe('stripDangerousHtml', () => {
  describe('dangerous tag removal', () => {
    it.each([
      'script',
      'noscript',
      'template',
      'iframe',
      'frame',
      'frameset',
      'object',
      'applet',
      'base',
      'link',
      'meta',
      'svg',
      'math',
    ])('removes <%s> and its subtree', tagName => {
      const tree = root(el('p'), el(tagName, {}, [el('span')]), el('div'));

      stripDangerousHtml(tree);

      const tags = tree.children.map(child => (child.type === 'element' ? child.tagName : child.type));
      expect(tags).toStrictEqual(['p', 'div']);
    });

    // Lowercase-leading names are host elements (uppercase-leading ones are custom
    // components), so the deny-set lookup lowercases to also catch e.g. `iFrame`.
    it('matches lowercase-leading dangerous tags case-insensitively', () => {
      const tree = root(el('iFrame'));

      stripDangerousHtml(tree);

      expect(tree.children).toHaveLength(0);
    });

    it('removes consecutive dangerous siblings', () => {
      const tree = root(el('script'), el('iframe'), el('p'));

      stripDangerousHtml(tree);

      expect(tree.children).toHaveLength(1);
      expect((tree.children[0] as Element).tagName).toBe('p');
    });
  });

  describe('host element attribute cleaning', () => {
    it('drops event-handler attributes', () => {
      const node = el('img', { src: 'x', onError: 'steal()', onClick: 'go()' });
      stripDangerousHtml(root(node));

      expect(node.properties).toStrictEqual({ src: 'x' });
    });

    it('drops javascript: and vbscript: URLs on url-valued attributes', () => {
      const node = el('a', { href: 'javascript:alert(1)' });
      const node2 = el('a', { href: 'vbscript:msgbox(1)' });
      stripDangerousHtml(root(node, node2));

      expect(node.properties).toStrictEqual({});
      expect(node2.properties).toStrictEqual({});
    });

    it('keeps safe URLs', () => {
      const node = el('a', { href: 'https://example.com/javascript:not-a-scheme' });
      stripDangerousHtml(root(node));

      expect(node.properties?.href).toBe('https://example.com/javascript:not-a-scheme');
    });

    it('drops dangerous data: URLs but keeps benign ones', () => {
      const danger = el('a', { href: 'data:text/html,<script>alert(1)</script>' });
      const safe = el('img', { src: 'data:image/png;base64,iVBOR' });
      stripDangerousHtml(root(danger, safe));

      expect(danger.properties).toStrictEqual({});
      expect(safe.properties?.src).toBe('data:image/png;base64,iVBOR');
    });

    it('ignores control characters when resolving the scheme', () => {
      const node = el('a', { href: 'java\tscript:alert(1)' });
      stripDangerousHtml(root(node));

      expect(node.properties).toStrictEqual({});
    });

    it('keeps a normal srcset (treated as a single URL, no javascript: scheme)', () => {
      const node = el('img', { srcSet: 'a.png 1x, b.png 2x' });
      stripDangerousHtml(root(node));

      expect(node.properties?.srcSet).toBe('a.png 1x, b.png 2x');
    });

    it('normalizes attribute names so xlink:href / formaction are checked', () => {
      const node = el('a', { xLinkHref: 'javascript:alert(1)', formAction: 'javascript:alert(1)' });
      stripDangerousHtml(root(node));

      expect(node.properties).toStrictEqual({});
    });
  });

  describe('MDX JSX nodes', () => {
    it('drops event-handler and javascript: attributes on host JSX elements', () => {
      const node = jsx('a', [
        { type: 'mdxJsxAttribute', name: 'onClick', value: 'go()' },
        { type: 'mdxJsxAttribute', name: 'href', value: 'javascript:alert(1)' },
        { type: 'mdxJsxAttribute', name: 'id', value: 'keep' },
      ]);
      stripDangerousHtml(root(node));

      expect(node.attributes).toStrictEqual([{ type: 'mdxJsxAttribute', name: 'id', value: 'keep' }]);
    });

    it('drops expression-valued URL attributes on host JSX elements', () => {
      // `href={'javascript:alert(1)'}` / `formAction={...}` — a non-string value could still
      // resolve to a dangerous scheme at render time, so it can't be trusted like a literal.
      const node = jsx('a', [
        { type: 'mdxJsxAttribute', name: 'href', value: { type: 'mdxJsxAttributeValueExpression', value: "'javascript:alert(1)'", data: {} } },
        { type: 'mdxJsxAttribute', name: 'formAction', value: { type: 'mdxJsxAttributeValueExpression', value: 'dynamicUrl', data: {} } },
        { type: 'mdxJsxAttribute', name: 'id', value: 'keep' },
      ]);
      stripDangerousHtml(root(node));

      expect(node.attributes).toStrictEqual([{ type: 'mdxJsxAttribute', name: 'id', value: 'keep' }]);
    });

    it('keeps spread expression attributes untouched', () => {
      const spread = { type: 'mdxJsxExpressionAttribute', value: '...{ onClick: handler }' } as const;
      const node = jsx('div', [spread]);
      stripDangerousHtml(root(node));

      expect(node.attributes).toStrictEqual([spread]);
    });

    it('preserves PascalCase components and their on* props, but strips URL props and cleans children', () => {
      const child = el('img', { onError: 'steal()' });
      const component = jsx('Callout', [
        { type: 'mdxJsxAttribute', name: 'onClick', value: 'props-not-a-handler' },
        { type: 'mdxJsxAttribute', name: 'href', value: 'javascript:alert(1)' },
      ]);
      component.children = [child];
      stripDangerousHtml(root(component));

      // The `on*` prop survives (React prop, not a DOM handler), but the dangerous URL prop
      // is stripped since a component may forward it to a host element...
      expect(component.attributes).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'onClick', value: 'props-not-a-handler' },
      ]);
      // ...and the nested raw <img> handler is stripped.
      expect(child.properties).toStrictEqual({});
    });
  });
});
