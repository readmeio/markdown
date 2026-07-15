# `table-in-callout` Fixture

A JSX `<Table>` nested inside a `<Callout>` body, with blank lines between the
`<tr>`/`<tbody>` elements — the exact reproduction from CX-3705. Locks in that
the table renders whole (header row + both body rows) inside the callout rather
than fragmenting its rows into text and a `<pre><code>` block.

## Source bugs

- CX-3705 — under MDXish, a `<Table>` inside a `<Callout>` lost all its rows
  when blank lines separated the rows. A callout body is re-parsed by the
  component-body processor (`getInlineMdProcessor`, built in
  `processor/transform/mdxish/components/utils.ts`), which was missing the
  `jsxTable` micromark tokenizer. Without it, `mdxComponent` chokes on `<Table>`
  and micromark falls back to CommonMark HTML block type 6, which terminates at
  every blank line — fragmenting the table so its rows spilled out as text and
  an indented row became a `<pre><code>` block. The fix adds `jsxTable()` +
  `jsxTableFromMarkdown()` to that processor so the `<Table>` survives the
  re-parse as one html node and `mdxishTables` can convert it normally.

## What it proves

- The MDXish per-engine snapshot (Suite A) contains the full
  `<div class="rdmd-table">…<table><thead><tr>…</tr></thead><tbody><tr>…</tr><tr>…</tr></tbody></table>`
  inside the callout — all three rows present, no `<pre>`/`<code>`. A regression
  that re-fragments the table would flip this snapshot (rows become stray text /
  a code block).
- The table renders identically to the MDX (RMDX) engine, matching the ticket's
  "should match how it renders under the MDX engine" expectation.
- Suite B reports a single `structural` change: the callout's top-level tag
  (`blockquote` on MDX vs the `readme-tailwind` `div` wrapper MDXish emits under
  `useTailwind`). That wrapper difference is a known cross-engine baseline shared
  by every callout-containing fixture; the table content itself is convergent.

## What flips this fixture

Removing `jsxTable()` / `jsxTableFromMarkdown()` from `buildInlineMdProcessor`
(`processor/transform/mdxish/components/utils.ts`), or any change to
`mdxishTables` / `mdxishMdxComponentBlocks` that stops a nested `<Table>` from
being captured as one html node and converted inside the component body.
