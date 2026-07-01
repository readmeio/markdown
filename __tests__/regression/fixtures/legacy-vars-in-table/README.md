# `legacy-vars-in-table` Fixture

A single-line raw `<table>` whose only cell mixes markdown emphasis with a
legacy `<<companyName>>` variable. Locks in that the legacy `<<…>>` token
resolves (to `Acme Inc`, from `context.json`) and that `**bold**` still renders
inside a raw table cell.

## Source bugs

- PR #1458 — once lowercase `<table>` cells were re-parsed through the table
  cell subprocessor (from #1403), legacy `<<…>>` variables broke the parse
  because the legacy-variable tokenizer wasn't registered in that subprocessor.
  The fix registers `legacyVariable()` (and its `fromMarkdown` half) inside
  `buildTableNodeProcessor`, controlling tokenizer ordering so `<<…>>` is
  claimed as a legacy variable instead of breaking the cell parse. (The same
  PR also added a no-`mdxjs` `fallbackTableNodeProcessor` for other cell
  content the strict parse rejects; this fixture's simple `<<…>>` resolves on
  the registered-tokenizer path, not the fallback.)

## MDX side is empty by design

Strict MDX rejects the legacy `<<companyName>>` syntax, so the committed
`legacy-vars-in-table (mdx) 1` snapshot is `""`. The MDXish-side snapshot is the
real regression contract: `<td><strong>bold</strong><span>Acme Inc</span></td>`.

## What flips this fixture

`legacyVariable()` registration in `buildTableNodeProcessor`
(`processor/transform/mdxish/tables/mdxish-tables.ts`), the top-level
`legacyVariable()` extension wired into the MDXish parse (`lib/mdxish.ts`), or a
change to how `context.json` variable values resolve at render time.
