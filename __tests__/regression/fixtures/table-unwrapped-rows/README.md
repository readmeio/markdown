# `table-unwrapped-rows` Fixture

Two tables whose rows skip the wrappers the HTML spec expects:

1. A `<Table>` whose `<thead>`/`<tbody>` hold bare `<td>` cells with **no `<tr>`**.
2. A lowercase `<table>` whose `<thead>` holds bare `<th>` cells with **no
   `<tr>`** and whose data row is a bare `<tr>` with **no `<tbody>`**.

Locks in that MDXish repairs the row structure instead of dropping the
unwrapped cells.

## Source bugs

- PR #1458 (importing #1411) — after #1403 routed lowercase `<table>` through
  the JSX table tokenizer, `<thead>` sections that weren't wrapped in `<tr>`,
  and `<tr>`/`<td>` rows without a `<tbody>`, failed to parse and dropped
  their cells. #1458 restored handling for these unbalanced shapes (and added
  a fallback table-node processor for cell content the strict parse rejects).

## What it proves

- MDXish normalizes both tables: it wraps the bare cells in `<tr>`, wraps the
  bare data row in `<tbody>`, and promotes `<thead>` cells to `<th>`, emitting
  well-formed
  `<thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody>`.
- For the first table (a `<Table>`, which both engines wrap in a
  `rdmd-table` div), Suite B's diff descends into the wrapper and surfaces the
  repair directly: the MDX-side `<thead><td>` becomes a `<tr>` on the MDXish
  side (`td`→`tr` changes in the change list).
- For the second table (lowercase `<table>`), MDX leaves the raw element while
  MDXish wraps it in a `rdmd-table` div, so Suite B's diff stops at that
  top-level `table`→`div` mismatch and does **not** descend to show the inner
  `<tr>`/`<tbody>` repair. That repair is instead locked in by the Suite A
  per-engine snapshots (MDX keeps `<thead><th>…</th></thead>` with no `<tr>`;
  MDXish emits `<thead><tr><th>…`).

## What flips this fixture

The `<tr>`/`<tbody>` synthesis in `mdxish-tables`, the thead-cell-to-`<th>`
promotion, or the fallback table-node processor.
