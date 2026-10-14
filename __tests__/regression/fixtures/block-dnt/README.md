# `block-dnt` Fixture

The block `<DNT>` (do not translate) tag: an opener alone on its line that
wraps whole blocks, next to the inline form it must not take over.

## Source bugs

- MDXish left a block `<DNT>` as a raw html block: the markdown inside never
  parsed, and the paragraphs after it ended up inside the span. A block `<DNT>`
  is now claimed whole by its own tokenizer (`lib/micromark/dnt`), which stamps the
  node `data.tokenized` so it is promoted to a flow element, and renders as
  `<div translate="no">`.
- Text right after the opener (`<DNT>- one`) was taken as inline, so a list or a
  component on the opener line lost its markup. The closer on its own line, or
  ending a later line, or a blank line in the body, now makes it a block.

## What it proves

- A block `<DNT>` renders as a div around its paragraphs and lists, in both
  engines, and an inline `<DNT>` inside it keeps its span.
- The text after the block stays outside it.
- A list or a `<Callout>` can start on the opener line.
- A `<DNT>` right under a paragraph line does not start a block in MDXish,
  same as a lowercase JSX tag. MDX starts a block there, so the engines differ
  on that one case. The text is protected either way.
- Under `useTailwind` MDXish wraps the inline span in a `readme-tailwind` span,
  like every JSX component. That is the known cross-engine baseline shared with
  every callout fixture (see `table-in-callout`).
- The block form works inside a callout and a list item.

## What flips this fixture

The `data.tokenized` stamp in `lib/mdast-util/dnt`, the block shape rule in
`lib/micromark/dnt/syntax.ts`, or `processor/transform/dnt-blocks.ts`.
