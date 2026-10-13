# `block-dnt` Fixture

The block `<DNT>` (do not translate) tag: an opener alone on its line that
wraps whole blocks, next to the inline form it must not take over.

## Source bugs

- MDXish left a block `<DNT>` as a raw html block: the markdown inside never
  parsed, and the paragraphs after it ended up inside the span. A `<DNT>` with
  its opener alone on its line is now claimed whole by the `mdxComponent`
  tokenizer (`BLOCK_FORM_COMPONENT_TAGS` in `lib/constants.ts`) and renders as
  `<div translate="no">`.

## What it proves

- A block `<DNT>` renders as a div around its paragraphs and lists, in both
  engines, and an inline `<DNT>` inside it keeps its span.
- The text after the block stays outside it.
- A `<DNT>` right under a paragraph line does not start a block in MDXish,
  same as a lowercase JSX tag. MDX starts a block there, so the engines differ
  on that one case. The text is protected either way.
- The block form works inside a callout and a list item.

## What flips this fixture

`BLOCK_FORM_COMPONENT_TAGS` in `lib/constants.ts`, the block-wrapper claim in
`lib/micromark/mdx-component/syntax.ts`, or `processor/transform/dnt-blocks.ts`.
