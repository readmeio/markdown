import type { Root as HastRoot } from 'hast';
import type { ImageReference, Root } from 'mdast';

import { hast, mdast } from '../../index';
import { mdxish } from '../../lib/mdxish';
import { collectNodes, findElementByTagName, parseMdxish } from '../helpers';

describe('non-text blockquotes, RM-19377', () => {
  describe.each([
    ['MDX', mdast, hast],
    ['MDXish', parseMdxish, mdxish],
    [
      'MDXish editor',
      (source: string) => parseMdxish(source, { newEditorTypes: true }),
      (source: string) => mdxish(source, { newEditorTypes: true }),
    ],
  ] satisfies [string, (source: string) => Root, (source: string) => HastRoot][])('%s', (_engine, parse, render) => {
    it.each([
      ['a full image reference', '![alt][img]', 'alt'],
      ['an image reference without alt text', '![][img]', ''],
      ['a collapsed image reference', '![img][]', 'img'],
      ['a shortcut image reference', '![img]', 'img'],
    ])('preserves %s and resolves its image', (_label, imageSource, alt) => {
      const source = `> ${imageSource}\n\n[img]: https://example.com/image.png`;
      const tree = parse(source);
      const [image] = collectNodes<ImageReference>(tree, 'imageReference');

      expect(tree.children[0].type).toBe('blockquote');
      expect(image).toMatchObject({ identifier: 'img', alt });
      expect(source.slice(image.position?.start.offset, image.position?.end.offset)).toBe(imageSource);

      const quote = findElementByTagName(render(source), 'blockquote');
      expect(quote).not.toBeNull();
      expect(findElementByTagName(quote!, 'img')?.properties).toMatchObject({
        src: 'https://example.com/image.png',
        alt,
      });
    });

    it.each([
      ['a thematic break', '> ---', 'thematicBreak', 'hr'],
      ['an empty fenced code block', '> ```\n> ```', 'code', 'code'],
      ['an empty heading', '> #', 'heading', 'h1'],
    ])('preserves a quote containing %s', (_label, source, nodeType, tagName) => {
      const tree = parse(source);

      expect(tree.children[0].type).toBe('blockquote');
      expect(collectNodes(tree, nodeType)).toHaveLength(1);

      const quote = findElementByTagName(render(source), 'blockquote');
      expect(quote).not.toBeNull();
      expect(findElementByTagName(quote!, tagName)).not.toBeNull();
    });

    it.each(['>', '> ', '>\n> '])('keeps a literal marker for the empty quote %j', source => {
      expect(parse(source).children).toMatchObject([{ type: 'paragraph', children: [{ type: 'text', value: '>' }] }]);
    });

    it('preserves the outer quote around an empty nested quote', () => {
      expect(parse('> >').children).toMatchObject([
        {
          type: 'blockquote',
          children: [{ type: 'paragraph', children: [{ type: 'text', value: '>' }] }],
        },
      ]);
    });
  });
});
