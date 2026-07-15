# `htmlblock` Fixture

Consolidated coverage for **top-level raw-HTML `<HTMLBlock>`** rendering across the
MDX and MDXish engines. Each `##` section is an independent scenario; a regression
shows up as a diff in the relevant section of the per-engine snapshot.

(`<HTMLBlock>` nested inside a `<Table>` cell lives in the separate
`htmlblock-in-table` fixture — it carries the `<Table>` component's own
mdx/mdxish divergence, which would otherwise pollute this fixture's diff.)

## Scenarios

| Section | Covers | Source bug |
|---------|--------|------------|
| Plain HTML inside an HTMLBlock | multiline `<HTMLBlock>` with a `<div>`, nested tags, an HTML entity, and a trailing paragraph; scripts must never execute | baseline |
| Raw HTML table nested inside an HTMLBlock | a raw-HTML `<table>` (`class`/`colspan`/`style="…"`) nested in `<div>` wrappers, with blank lines between `<tr>` groups | CX-3701 (Class 1 hard crash) |

## Why the nested-table scenario matters (CX-3701)

Under MDXish the inner `<table>` used to be claimed by the table machinery (the
`jsxTable` tokenizer + `mdxishTables`' `splitHtmlWithNestedTables` pre-pass), and
the blank lines fragmented the block into `html` + parsed-table + `html`
siblings that `mdxishHtmlBlocks` could not reassemble. The `HTMLBlock` component
then received non-string children and threw
`TypeError: HTMLBlock: children must be a string`, which bubbled to the
page-level error boundary and replaced the ENTIRE page.

## What flips this fixture

The MDXish `<HTMLBlock>` parse/transform path — the `htmlBlockComponent`
tokenizer (`lib/mdxish.ts`), the `splitHtmlWithNestedTables` HTMLBlock guard
(`processor/transform/mdxish/tables/split-nested-tables.ts`), or
`mdxishHtmlBlocks`. Because these bodies are genuine raw HTML, both engines must
render them identically via `dangerouslySetInnerHTML`; if MDXish fragments a
block again, its snapshot flips (or throws) while the MDX snapshot stays put,
surfacing as an equivalence diff.
