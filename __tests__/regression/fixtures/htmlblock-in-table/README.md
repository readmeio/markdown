# `htmlblock-in-table` Fixture

A `<Table>` with one markdown cell (`**bold** still works`) and one cell whose
content is an `<HTMLBlock>` carrying a raw `<div>` template literal. Locks in
that the HTMLBlock renders inside the table cell without breaking the table,
and that a sibling cell still gets normal markdown handling.

## Source bugs

- PR #1484 — `<HTMLBlock>` inside a JSX `<Table>` did not render. The old
  pipeline encoded HTMLBlock bodies into an HTML-comment marker
  (`<!--RDMX_HTMLBLOCK:…-->`); the table transformer's `remarkMdx` re-parse
  rejected that comment, so the whole table failed to parse. The fix lets the
  `mdxComponent` tokenizer claim `<HTMLBlock>` and read its body straight from
  the parsed template literal — no marker round-trip — and keeps a table as
  JSX `<Table>` when a cell holds block-level HTMLBlock content a GFM cell
  can't represent.

## What it proves

- Both engines render the cell's `<div style="color: red;">Hello</div>` inside
  a `<div class="rdmd-html">` wrapper, with the sibling `<strong>bold</strong>`
  cell intact. This in-cell render guarantee is enforced by the Suite A
  per-engine snapshots — a regression that re-broke HTMLBlock-in-table parsing
  would empty or mangle the MDXish cell and flip them.
- The cell *content* is identical across engines; the only Suite B divergence
  is cosmetic — MDXish wraps the table in `<div class="readme-tailwind">`, which
  shifts the node paths, so the diff reports the wrapper class/tag changes
  (`rdmd-table`→`readme-tailwind`, `table`→`div`) rather than any content
  difference.

## What flips this fixture

`TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS`, the `mdxish-html-blocks` transformer's
JSX-element branch, or the `mdxish-tables` rule that keeps a cell with an
`<HTMLBlock>` as JSX `<Table>`.
