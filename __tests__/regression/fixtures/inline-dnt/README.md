# `inline-dnt` Fixture

The inline `<DNT>` (do not translate) tag across the shapes a doc uses it in:
mid paragraph, at the start of a line, wrapping inline markdown, in a list
item, in a table cell, and inside a callout.

## Source bugs

- MDXish dropped the text inside `<DNT>` on render (unknown
  component), and a `<DNT>` at the start of a line was claimed by the block
  tokenizer, which split the paragraph. `DNT` now has its own tokenizer
  (`lib/micromark/dnt`) that claims the whole `<DNT>…</DNT>` as one inline node,
  and a `DNT` component that renders `<span translate="no">`.

## What it proves

- Every `<DNT>` renders as `<span translate="no">` with its children, in both
  engines.
- The line-start `<DNT>` stays inside one paragraph.
- Inline markdown inside (bold, links, code, emphasis) still renders.
- Each `<DNT>` is one node with exact offsets, so an opener and its closer
  cannot drift apart.
- Suite B reports only the `readme-tailwind` span MDXish wraps around every
  JSX component under `useTailwind`, the known cross-engine baseline (see
  `table-in-callout`).

## What flips this fixture

`lib/micromark/dnt/syntax.ts`, the `data.tokenized` stamp in `lib/mdast-util/dnt`,
`components/DNT.tsx`, or the inline promotion in
`processor/transform/mdxish/components/inline-html.ts`.
