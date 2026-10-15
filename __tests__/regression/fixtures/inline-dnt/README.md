# `inline-dnt` Fixture

The inline `<DNT>` (do not translate) tag across the shapes a doc uses it in:
mid paragraph, at the start of a line, wrapping inline markdown, in a list
item, in a table cell, inside a callout, and in an Accordion title.

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
- A `<DNT>` inside a title prop renders as the span in both engines. A string
  prop is plain text, so `components/DNT.tsx` reads that one tag out of the
  Accordion, Card and Tab titles.
- Suite B reports only the `readme-tailwind` span MDXish wraps around every
  JSX component under `useTailwind`, the known cross-engine baseline (see
  `table-in-callout`).

## What flips this fixture

`lib/micromark/dnt/syntax.ts`, the `data.tokenized` stamp in `lib/mdast-util/dnt`,
`components/DNT.tsx` (the component and `dntTagsToSpans`), or the inline
promotion in `processor/transform/mdxish/components/inline-html.ts`.
