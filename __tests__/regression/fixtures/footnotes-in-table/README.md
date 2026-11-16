# `footnotes-in-table` Fixture

Footnote references inside JSX `<Table>` and lowercase `<table>` cells, with
the definitions below the tables. Locks in that each reference renders as a
`<sup>` link and the definitions render in the footnote section.

## Source bugs

- RM-16727 — `mdxishTables` re-parses each table on its own, so remark-gfm
  never saw the page's `[^id]:` definitions and left `[^1]` as literal text.
  The fix registers the page's footnote labels on the table processors via
  `footnoteLabels` (`lib/micromark/footnote-labels`).

## What flips this fixture

`footnoteLabels` registration in `buildTableNodeProcessor`
(`processor/transform/mdxish/tables/mdxish-tables.ts`), or
`collectFootnoteLabels` in `processor/transform/mdxish/parse-markdown-fragment.ts`.
