# `inline-no-translate` Fixture

The inline `<NoTranslate>` (do not translate) tag across the shapes a doc uses it in:
mid paragraph, at the start of a line, wrapping inline markdown, in a list
item, in a table cell, inside a callout, and in an Accordion title.

## Source bugs

- MDXish dropped the text inside `<NoTranslate>` on render (unknown
  component), and a `<NoTranslate>` at the start of a line was claimed by the block
  tokenizer, which split the paragraph. `NoTranslate` now has its own tokenizer
  (`lib/micromark/no-translate`) that claims the whole `<NoTranslate>…</NoTranslate>` as one inline node,
  and a `NoTranslate` component that renders `<span translate="no">`.

## What it proves

- Every `<NoTranslate>` renders as `<span translate="no">` with its children, in both
  engines.
- The line-start `<NoTranslate>` stays inside one paragraph.
- Inline markdown inside (bold, links, code, emphasis) still renders.
- Each `<NoTranslate>` is one node with exact offsets, so an opener and its closer
  cannot drift apart.
- A `<NoTranslate>` inside a title prop renders as the span in both engines. A string
  prop is plain text, so `components/NoTranslate.tsx` reads that one tag out of the
  Accordion, Card and Tab titles.
- Suite B reports only the `readme-tailwind` span MDXish wraps around every
  JSX component under `useTailwind`, the known cross-engine baseline (see
  `table-in-callout`).

## What flips this fixture

`lib/micromark/no-translate/syntax.ts`, the `data.tokenized` stamp in `lib/mdast-util/no-translate`,
`components/NoTranslate.tsx` (the component and `noTranslateTagsToSpans`), or the inline
promotion in `processor/transform/mdxish/components/inline-html.ts`.
