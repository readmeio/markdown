# `deprecated-html-tags` Fixture

Legacy HTML tags that the `html-tags` package omits — `<center>`, `<font>`,
`<big>`, `<strike>`, `<tt>`, `<acronym>` — authored across the shapes a real doc
uses them in: inside `<Card>` bodies, around a blank-line separated markdown
island, inline in a paragraph, in markdown table cells, nested inside plain HTML,
and inside a callout.

## Source bugs

- **CX-3699** — `<center>` inside a card body rendered a blank card. MDXish
  builds its "is this HTML or a custom component?" check from `html-tags`, which
  excludes deprecated tags, so `<center>` was treated as an unknown component
  `Center` and removed from the tree by `rehypeMdxishComponents` — taking the
  card's only child with it. The card body opening is the customer's own doc
  from the ticket.

## What it proves

- Every deprecated tag survives the tree as a real element with its attributes
  (`<font color size>`, `<acronym title>`) and its markdown children parsed
  (`**bold**` → `<strong>`), in both engines.
- The three `<Card>` bodies render their centered headings instead of collapsing
  to empty `Card-content` divs.
- Blank-line islands, table cells, and plain-HTML nesting keep the tag rather
  than dropping the subtree.

Suite B reports `differ`, but every change is a known engine difference
unrelated to these tags: MDXish wraps `<Cards>` in `<div
class="readme-tailwind">` (shifting the card paths) and turns the soft line
break in the inline-formatting paragraph into a `<br>`.

## What flips this fixture

`DEPRECATED_HTML_TAGS` / `STANDARD_HTML_TAGS` in `utils/common-html-words.ts`,
the unknown-component removal in `processor/plugin/mdxish-components.ts`, or the
tag-name normalization in `normalize-mdx-jsx-nodes.ts`.
