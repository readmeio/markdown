import type { Anchor } from '../../types';
import type { PhrasingContent, Root as MdastRoot } from 'mdast';

import { NodeTypes } from '../../enums';
import { mdxishMdastToMd } from '../../lib';
import { roundTripMdxish } from '../helpers';

const anchorNode = (hProperties: Anchor['data']['hProperties'], children: PhrasingContent[]): Anchor => ({
  type: NodeTypes.anchor,
  data: { hName: 'Anchor', hProperties },
  children,
});

const paragraph = (children: PhrasingContent[]): MdastRoot => ({
  type: 'root',
  children: [{ type: 'paragraph', children }],
});

/** The attributes the editor stamps on a link opened in a new tab. */
const newTab = { href: 'https://example.com', target: '_blank' } as const;

// The anchor handler is only registered for mdxish, so there's no mdx fork here.
describe('mdxish anchor compiler', () => {
  describe('attributes', () => {
    it('should serialize a readme-anchor node as <Anchor> JSX', () => {
      const mdast = paragraph([
        { type: 'text', value: 'Click ' },
        anchorNode(newTab, [{ type: 'text', value: 'here' }]),
        { type: 'text', value: ' to open.' },
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        'Click <Anchor target="_blank" href="https://example.com">here</Anchor> to open.\n',
      );
    });

    it('should serialize an anchor with no target', () => {
      const mdast = paragraph([anchorNode({ href: 'https://example.com' }, [{ type: 'text', value: 'here' }])]);

      expect(mdxishMdastToMd(mdast)).toBe('<Anchor href="https://example.com">here</Anchor>\n');
    });

    it('should serialize every supported attribute', () => {
      const mdast = paragraph([
        anchorNode({ ...newTab, label: 'example', title: 'Example Site' }, [{ type: 'text', value: 'example' }]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor label="example" target="_blank" href="https://example.com" title="Example Site">example</Anchor>\n',
      );
    });

    it('should serialize multiple anchors in the same paragraph', () => {
      const mdast = paragraph([
        anchorNode({ href: 'https://one.com', target: '_blank' }, [{ type: 'text', value: 'one' }]),
        { type: 'text', value: ' and ' },
        anchorNode({ href: 'https://two.com', target: '_blank' }, [{ type: 'text', value: 'two' }]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor target="_blank" href="https://one.com">one</Anchor> and <Anchor target="_blank" href="https://two.com">two</Anchor>\n',
      );
    });

    it('should serialize an anchor with no label as self-closing', () => {
      const mdast = paragraph([anchorNode({ href: 'https://example.com' }, [])]);

      expect(mdxishMdastToMd(mdast)).toBe('<Anchor href="https://example.com" />\n');
    });
  });

  describe('labels', () => {
    it('should serialize formatted content', () => {
      const mdast = paragraph([
        anchorNode(newTab, [{ type: 'strong', children: [{ type: 'text', value: 'bold link' }] }]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor target="_blank" href="https://example.com">**bold link**</Anchor>\n',
      );
    });

    it('should serialize a variable (CX-3873)', () => {
      const mdast = paragraph([
        anchorNode(newTab, [
          { type: 'text', value: 'Welcome to ' },
          { type: NodeTypes.variable, data: { hName: 'readme-variable', hProperties: { name: 'company' } }, value: '' },
        ]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor target="_blank" href="https://example.com">Welcome to {user.company}</Anchor>\n',
      );
    });

    it('should serialize emoji and glossary nodes', () => {
      const mdast = paragraph([
        anchorNode(newTab, [
          { type: NodeTypes.emoji, name: 'smile' },
          { type: 'text', value: ' our ' },
          {
            type: NodeTypes.glossary,
            data: { hName: 'Glossary', hProperties: { term: 'API' } },
            children: [{ type: 'text', value: 'API' }],
          },
        ]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor target="_blank" href="https://example.com">:smile: our <Glossary>API</Glossary></Anchor>\n',
      );
    });

    it("should serialize with the document's serializer options", () => {
      const mdast = paragraph([
        anchorNode(newTab, [
          { type: 'emphasis', children: [{ type: 'text', value: 'read' }] },
          { type: 'text', value: ' the snake_case_word docs' },
        ]),
      ]);

      expect(mdxishMdastToMd(mdast)).toBe(
        '<Anchor target="_blank" href="https://example.com">_read_ the snake_case_word docs</Anchor>\n',
      );
    });
  });

  describe('round trips', () => {
    it('should leave a link with no target as a plain markdown link', () => {
      const md = 'Read the [{user.company} docs](https://example.com) now.\n';

      expect(roundTripMdxish(md, { newEditorTypes: true })).toBe(md);
    });

    it('should round-trip a variable in the label', () => {
      const md = '<Anchor target="_blank" href="https://example.com">{user.company}</Anchor>\n';

      const once = roundTripMdxish(md, { newEditorTypes: true });

      expect(once).toBe(md);
      expect(roundTripMdxish(once, { newEditorTypes: true })).toBe(once);
    });

    it('should round-trip a variable in a loosely formatted label', () => {
      const md =
        'Read the <Anchor  href="https://example.com"   target="_blank" >  {user.company} docs  </Anchor> now.\n';

      const once = roundTripMdxish(md, { newEditorTypes: true });

      // Attributes are normalized, but the label's own spacing is left alone.
      expect(once).toBe(
        'Read the <Anchor target="_blank" href="https://example.com">  {user.company} docs  </Anchor> now.\n',
      );
      expect(roundTripMdxish(once, { newEditorTypes: true })).toBe(once);
    });

    it('should keep a table holding an anchor promoted to JSX', () => {
      const md = '| a | b |\n| :- | :- |\n| <Anchor href="https://example.com">{user.company}</Anchor> | y |\n';

      expect(roundTripMdxish(md, { newEditorTypes: true })).toContain(
        '<td>\n        <Anchor href="https://example.com">{user.company}</Anchor>\n      </td>',
      );
    });

    it('should round-trip a variable in a label nested in a callout', () => {
      const md = `<Callout icon="📘" theme="info">
  Read the <Anchor target="_blank" href="https://example.com">{user.company} docs</Anchor>.
</Callout>
`;

      expect(roundTripMdxish(md, { newEditorTypes: true })).toBe(md);
    });
  });
});
