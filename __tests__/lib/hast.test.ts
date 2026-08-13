import type { Element, RootContent } from 'hast';

import { h } from 'hastscript';

import { hast } from '../../lib';

describe('hast transformer', () => {
  it('parses components into the tree', () => {
    const md = `
## Test

<Example />
    `;
    const components = {
      Example: "## It's coming from within the component!",
    };

    const expected = h(
      undefined,
      h('h2', { id: 'test' }, 'Test'),
      '\n',
      h('h2', { id: 'its-coming-from-within-the-component' }, "It's coming from within the component!"),
    );

    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(hast(md, { components })).toStrictEqualExceptPosition(expected);
  });

  // JSX component attribute expressions were evaluated with `new Function` regardless of
  // caller intent, and there was no way to opt out.
  describe('safeMode', () => {
    const getCalloutIcon = (tree: ReturnType<typeof hast>) => {
      const callout = tree.children.find(
        (node: RootContent): node is Element => node.type === 'element' && node.tagName === 'Callout',
      );
      return callout?.properties?.icon;
    };

    it('evaluates JSX attribute expressions by default', () => {
      const tree = hast('<Callout icon={String(1 + 3)} />');

      expect(getCalloutIcon(tree)).toBe('4');
    });

    it('does not evaluate JSX attribute expressions when safeMode is true', () => {
      const tree = hast('<Callout icon={String(1 + 3)} />', { safeMode: true });

      expect(getCalloutIcon(tree)).toBe('String(1 + 3)');
    });

    it('does not expose Node process globals when safeMode is true', () => {
      const tree = hast('<Callout icon={typeof process} />', { safeMode: true });

      expect(getCalloutIcon(tree)).toBe('typeof process');
    });

    // Custom component bodies were parsed with a fresh default-unsafe processor, so their
    // attribute expressions evaluated even when the caller asked for safeMode.
    it('does not evaluate attribute expressions inside custom component definitions', () => {
      globalThis.componentCanary = false;
      hast('<Custom />', {
        components: { Custom: '<Callout icon={(globalThis.componentCanary = true)} />' },
        safeMode: true,
      });

      expect(globalThis.componentCanary).toBe(false);
    });
  });
});
