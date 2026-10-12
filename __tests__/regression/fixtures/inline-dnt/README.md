# `inline-dnt` Fixture

The inline `<DNT>` (do not translate) tag across the shapes a doc uses it in:
mid paragraph, at the start of a line, wrapping inline markdown, in a list
item, in a table cell, and inside a callout.

## Source bugs

- MDXish dropped the text inside `<DNT>` on render (unknown
  component), and a `<DNT>` at the start of a line was claimed by the block
  tokenizer, which split the paragraph. `DNT` is now an inline component tag
  (`INLINE_COMPONENT_TAGS` in `lib/constants.ts`) with a `DNT` component that
  renders `<span translate="no">`.

## What it proves

- Every `<DNT>` renders as `<span translate="no">` with its children, in both
  engines.
- The line-start `<DNT>` stays inside one paragraph.
- Inline markdown inside (bold, links, code, emphasis) still renders.

## What flips this fixture

`INLINE_COMPONENT_TAGS` in `lib/constants.ts`, `components/DNT.tsx`, or the
inline component merge in `processor/transform/mdxish/components/inline-mdx-blocks.ts`.
