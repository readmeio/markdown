/**
 * Pattern to match component tags (PascalCase or snake_case)
 */
export declare const componentTagPattern: RegExp;
/**
 * MDAST flow (block-level) content types that cannot be represented
 * inside GFM table cells. Used to decide whether a table should be
 * serialized as GFM or as JSX `<Table>` syntax.
 *
 * @see https://github.com/syntax-tree/mdast#flowcontent
 */
export declare const FLOW_TYPES: Set<string>;
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
export declare const INLINE_ONLY_PARENT_TYPES: Set<string>;
/**
 * Inline-only custom components that appear as phrasing content within
 * paragraph nodes. Excluding them from the generic `mdxComponent` micromark
 * construct lets the dedicated inline transformer handle them instead.
 *
 * @see processor/transform/mdxish/components/inline-mdx-blocks.ts
 */
export declare const INLINE_COMPONENT_TAGS: Set<string>;
/**
 * PascalCase tags excluded from generic `<Name ...>` MDX-style handling in
 * both the micromark tokenizer and the mdxish remark transforms.
 */
export declare const GENERIC_MDX_COMPONENT_EXCLUDED_TAGS: Set<string>;
/**
 * Lowercased variant of {@link INLINE_COMPONENT_TAGS} for consumers that
 * run after rehype (where hast `tagName` is normalized to lowercase).
 */
export declare const INLINE_COMPONENT_TAGS_LOWER: Set<string>;
