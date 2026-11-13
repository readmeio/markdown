# `self-closing-inline-components` Fixture

Self-closing inline components (`<Anchor />`, `<NoTranslate />`, `<Glossary />`)
with plain attributes, inline and on their own line.

## Source bugs

- RM-19074: MDXish left a self-closing inline component as a raw html node, so
  parse5 (`rehype-raw`) ignored the `/` and opened the tag. Inline, it wrapped the
  rest of the paragraph, cell or list item; on its own line, it wrapped the
  paragraphs after it. Both component passes now promote it to an empty JSX element.

## What it proves

- Inline, the text after the tag stays outside it, with and without a space before `/>`,
  in a paragraph, a list item and a table cell.
- On its own line, the next paragraph and the line right under it stay outside it.
- A paired `<Anchor>` still wraps its own text.
- The remaining engine diff is MDXish's `readme-tailwind` wrapper around each
  promoted component, the known baseline shared with `block-no-translate`.

## What flips this fixture

The self-closing checks in `processor/transform/mdxish/components/inline-html.ts`
(`promoteInlineHtml`) and `processor/transform/mdxish/components/mdx-blocks.ts`
(`isBlockForm`).
