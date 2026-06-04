/**
 * Pattern to match component tags (PascalCase or snake_case)
 */
export const componentTagPattern = /<(\/?[A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>/g;

/**
 * MDAST flow (block-level) content types that cannot be represented
 * inside GFM table cells. Used to decide whether a table should be
 * serialized as GFM or as JSX `<Table>` syntax.
 *
 * @see https://github.com/syntax-tree/mdast#flowcontent
 */
export const FLOW_TYPES = new Set([
  'blockquote',
  'code',
  'heading',
  'html',
  'list',
  'table',
  'thematicBreak',
]);

/**
 * MDAST parent types whose children are restricted to inline content. A block-level
 * node placed inside any of these violates the parent's content model and breaks
 * downstream consumers
 *
 * Derived from the mdast spec. Seven of these are direct "phrasing content" parents:
 *   - paragraph, heading, link, linkReference, emphasis, strong
 *   - tableCell (phrasing minus Break)
 *
 * @link {https://github.com/syntax-tree/mdast}
 *
 * `delete` is GFM and has *transparent* content, see:
 * @link {https://github.com/syntax-tree/mdast-util-gfm-strikethrough}
 *
 * its children must also be phrasing, so it belongs here too.
 *
 * NOTE: exported so downstream consumers can reuse and not drift away
 */
export const INLINE_ONLY_PARENT_TYPES = new Set([
  'paragraph',
  'heading',
  'tableCell',
  'link',
  'linkReference',
  'emphasis',
  'strong',
  'delete',
]);

// HELPER CONSTANTS FOR MDXISH RENDERING

/**
 * Inline-only custom components that appear as phrasing content within
 * paragraph nodes. Excluding them from the generic `mdxComponent` micromark
 * construct lets the dedicated inline transformer handle them instead.
 *
 * @see processor/transform/mdxish/components/inline-mdx-blocks.ts
 */
export const INLINE_COMPONENT_TAGS = new Set(['Anchor', 'Glossary']);

/**
 * PascalCase tags that have their own dedicated tokenizer / transformer
 * and must not be claimed by the generic `mdxComponent` construct.
 * Subject to change as we add more dedicated tokenizers.
 */
const DEDICATED_COMPONENT_TAGS = ['HTMLBlock', 'Table'] as const;

/**
 * PascalCase tags excluded from generic `<Name ...>` MDX-style handling in
 * both the micromark tokenizer and the mdxish remark transforms.
 */
export const GENERIC_MDX_COMPONENT_EXCLUDED_TAGS = new Set<string>([
  ...DEDICATED_COMPONENT_TAGS,
  ...INLINE_COMPONENT_TAGS,
]);

/**
 * Tags the micromark `mdxComponent` tokenizer must not claim, which
 * are inline components and those that have their own dedicated tokenizer
 */
export const TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS = new Set<string>([
  'Table',
  ...INLINE_COMPONENT_TAGS,
]);

/**
 * Lowercased variant of {@link INLINE_COMPONENT_TAGS} for consumers that
 * run after rehype (where hast `tagName` is normalized to lowercase).
 */
export const INLINE_COMPONENT_TAGS_LOWER = new Set(
  [...INLINE_COMPONENT_TAGS].map(t => t.toLowerCase()),
);
