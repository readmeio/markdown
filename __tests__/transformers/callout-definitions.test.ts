import type { Definition, Root } from 'mdast';

import { hast, mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';
import { collectNodes, findAllElementsByTagName, parseMdxish } from '../helpers';

const definitionSources = [
  ['a direct definition', '> [x]: https://x.com'],
  ['a nested definition', '> > [x]: https://x.com'],
  ['multiple definitions', '> [x]: https://x.com\n> [y]: https://y.com'],
] as const;

describe('reference-only blockquotes, RM-19377', () => {
  describe.each([
    ['MDX', mdast],
    ['MDXish', parseMdxish],
    ['MDXish editor', (source: string) => parseMdxish(source, { newEditorTypes: true })],
  ] satisfies [string, (source: string) => Root][])('%s', (_engine, parse) => {
    it.each(definitionSources)('preserves %s and its page offsets', (_label, definitionSource) => {
      const source = `Before\n\n${definitionSource}\n\n[x]\n\nAfter`;
      const tree = parse(source);
      const definitions = collectNodes<Definition>(tree, 'definition');

      expect(collectNodes(tree, 'blockquote')).not.toHaveLength(0);
      expect(definitions.map(node => node.identifier)).toStrictEqual(
        definitionSource.includes('[y]') ? ['x', 'y'] : ['x'],
      );
      for (const definition of definitions) {
        expect(source.slice(definition.position?.start.offset, definition.position?.end.offset)).toBe(
          `[${definition.identifier}]: ${definition.url}`,
        );
      }
    });
  });

  describe.each([
    ['MDX', hast],
    ['MDXish', mdxish],
    ['MDXish editor', (source: string) => mdxish(source, { newEditorTypes: true })],
  ])('%s rendering', (_engine, render) => {
    it.each(definitionSources)('resolves a link from %s', (_label, definitionSource) => {
      const tree = render(`${definitionSource}\n\n[x]`);

      expect(findAllElementsByTagName(tree, 'a').map(node => node.properties.href)).toContain('https://x.com');
    });

    it('keeps the first definition when a later definition repeats its identifier', () => {
      const tree = render('> > [x]: https://first.com\n\n[x]: https://second.com\n\n[x]');

      expect(findAllElementsByTagName(tree, 'a').map(node => node.properties.href)).toStrictEqual([
        'https://first.com',
      ]);
    });
  });
});
