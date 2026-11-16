# `jsx-table-cell-block-markers` Fixture

Raw `<table>` and JSX `<Table>` cells whose text starts with a block marker
(`-`, `#`, `---`, `1.`, `>`), with and without a backslash escape.

## Source bugs

- RM-16838 — MDXish re-parsed each text-only cell as its own document, so
  `<td>- foo</td>` became a list, `<td>#</td>` an empty heading, and `\-`
  needed two backslashes.

## What it proves

- Both engines render every marker as literal text, with a single backslash
  escape honored, while inline emphasis (`*kept*`) still parses.
- Suite B's only difference is the existing `rdmd-table` wrapper MDXish adds
  around the lowercase `<table>`; the cells are convergent.

## What flips this fixture

Any change that re-parses cell text outside its inline context in
`processor/transform/mdxish/tables/mdxish-tables.ts`.
