import type { RMDXModule } from '../../../types';

import { visit } from 'unist-util-visit';

import { mdxish } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName } from '../../helpers';

/** Collects every property key present on any element in the tree. */
function allPropertyKeys(tree: ReturnType<typeof mdxish>): string[] {
  const keys = new Set<string>();
  visit(tree, 'element', node => {
    Object.keys(node.properties ?? {}).forEach(key => keys.add(key));
  });
  return [...keys];
}

describe('mdxish raw HTML sanitization', () => {
  describe('script execution vectors', () => {
    it('strips the MathML namespace-confusion payload from the report', () => {
      const tree = mdxish('# Docs\n\n<math><mtext><script>window.__xssfired=1</script></mtext></math>\n');

      expect(findElementByTagName(tree, 'script')).toBeNull();
      expect(findElementByTagName(tree, 'math')).toBeNull();
      expect(findElementByTagName(tree, 'mtext')).toBeNull();
      // The heading and surrounding structure survive.
      expect(findElementByTagName(tree, 'h1')).not.toBeNull();
    });

    it('strips scripts containing String.fromCharCode payload', () => {
      const payload =
        '<math><mtext><script>fetch(String.fromCharCode(47,97,112,105)).then(function(r){return r.text()})</script></mtext></math>';
      const tree = mdxish(`# Docs\n\n${payload}\n`);

      expect(findElementByTagName(tree, 'script')).toBeNull();
      expect(JSON.stringify(tree)).not.toContain('fromCharCode');
    });

    it('strips a bare top-level <script>', () => {
      const tree = mdxish('<script>alert(1)</script>');

      expect(findElementByTagName(tree, 'script')).toBeNull();
    });

    it('strips SVG foreign content carrying a script', () => {
      const tree = mdxish('<svg><foreignObject><script>alert(1)</script></foreignObject></svg>');

      expect(findElementByTagName(tree, 'svg')).toBeNull();
      expect(findElementByTagName(tree, 'script')).toBeNull();
    });

    it('strips embedders (iframe/object)', () => {
      const tree = mdxish('<iframe src="javascript:alert(1)"></iframe>\n\n<object data="x"></object>');

      expect(findElementByTagName(tree, 'iframe')).toBeNull();
      expect(findElementByTagName(tree, 'object')).toBeNull();
    });
  });

  describe('attribute vectors', () => {
    it('removes event-handler attributes but keeps the element', () => {
      const tree = mdxish('<img src="x.png" onerror="alert(1)" alt="ok">');

      const img = findElementByTagName(tree, 'img');
      expect(img).not.toBeNull();
      expect(allPropertyKeys(tree)).not.toContain('onError');
      expect(img?.properties?.src).toBe('x.png');
    });

    it('removes javascript: hrefs but keeps the anchor text', () => {
      const tree = mdxish('<a href="javascript:alert(1)">click me</a>');

      const anchor = findElementByTagName(tree, 'a');
      expect(anchor).not.toBeNull();
      expect(anchor?.properties?.href).toBeUndefined();
      expect(JSON.stringify(tree)).toContain('click me');
    });

    it('ignores whitespace/control-char obfuscated javascript: URLs', () => {
      const tree = mdxish('<a href="java\tscript:alert(1)">x</a>');

      expect(findElementByTagName(tree, 'a')?.properties?.href).toBeUndefined();
    });
  });

  describe('safe content is preserved', () => {
    it('keeps benign formatting, links, and images', () => {
      const tree = mdxish(
        '<div class="note"><strong>Bold</strong> and <a href="https://example.com">link</a></div>\n\n<img src="https://example.com/a.png" alt="ok">',
      );

      expect(findElementByTagName(tree, 'strong')).not.toBeNull();
      expect(findElementByTagName(tree, 'a')?.properties?.href).toBe('https://example.com');
      expect(findElementByTagName(tree, 'img')?.properties?.src).toBe('https://example.com/a.png');
    });

    it('keeps relative and mailto links', () => {
      const tree = mdxish('<a href="/docs/start">a</a> <a href="mailto:x@y.com">b</a>');

      const hrefs = findAllElementsByTagName(tree, 'a').map(node => node.properties?.href);
      expect(hrefs).toStrictEqual(['/docs/start', 'mailto:x@y.com']);
    });
  });

  describe('custom components', () => {
    const testComponents: Record<string, RMDXModule> = {
      TestComponent: {} as RMDXModule
    }
      
    it('keeps event-handler-named props but strips dangerous URL props on PascalCase components', () => {
      const tree = mdxish('<TestComponent onClick="fn" href="javascript:alert(1)" />', {
        components: testComponents,
      });

      const component = findElementByTagName(tree, 'TestComponent');
      // `on*` props are React props on a component, not DOM handlers, so they survive...
      expect(component?.properties?.onClick).toBe('fn');
      // ...but a `javascript:` URL prop is stripped: a component may forward it to a host element.
      expect(component?.properties?.href).toBeUndefined();
    });

    it('keeps safe URL props on PascalCase components', () => {
      const tree = mdxish('<TestComponent href="https://example.com" />', {
        components: testComponents,
      });

      const component = findElementByTagName(tree, 'TestComponent');
      expect(component?.properties?.href).toBe('https://example.com');
    });

    it('still sanitizes raw HTML nested inside a component', () => {
      const tree = mdxish('<TestComponent>\n\n<img src="x" onerror="alert(1)">\n\n</TestComponent>', {
        components: testComponents,
      });

      expect(allPropertyKeys(tree)).not.toContain('onError');
      expect(findElementByTagName(tree, 'img')).not.toBeNull();
    });
  });

  describe('integration with other nodes', () => {
    it('sanitizes raw HTML embedded inside a table cell', () => {
      const tree = mdxish('| A | B |\n| --- | --- |\n| <img src=x onerror=alert(1)> | ok |');

      expect(allPropertyKeys(tree)).not.toContain('onError');
      expect(findElementByTagName(tree, 'script')).toBeNull();
    });

    it('sanitizes raw HTML nested inside a callout', () => {
      const tree = mdxish('> 📘 Title\n>\n> <script>alert(1)</script> body text');

      expect(findElementByTagName(tree, 'script')).toBeNull();
      expect(JSON.stringify(tree)).toContain('body text');
    });

    it('sanitizes raw HTML nested inside a JSX table cell', () => {
      const tree = mdxish(`
<Table>
  <tbody>
    <tr>
      <td>
        <script>alert(1)</script>
      </td>
    </tr>
  </tbody>
</Table>
        `);

      expect(findElementByTagName(tree, 'script')).toBeNull();
      expect(findElementByTagName(tree, 'table')).not.toBeNull();
    });
  });
});
