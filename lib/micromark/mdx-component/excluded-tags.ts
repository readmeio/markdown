/**
 * Inline-only custom components. These must not use generic block-level
 * `<Component>...</Component>` handling (MDXish transforms) or be treated as
 * flow elements where inline semantics apply.
 */
export const INLINE_COMPONENT_TAGS = new Set(['Anchor', 'Glossary']);

const DEDICATED_COMPONENT_TAGS = ['HTMLBlock', 'Table'] as const;

/**
 * PascalCase tags excluded from generic `<Name ...>` MDX-style handling in
 * micromark and in MDXish remark transforms — each has a dedicated tokenizer
 * or transformer.
 */
export const GENERIC_MDX_COMPONENT_EXCLUDED_TAGS = new Set<string>([
  ...DEDICATED_COMPONENT_TAGS,
  ...INLINE_COMPONENT_TAGS,
]);
