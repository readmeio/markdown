# `indented-markdown-islands-in-html` Fixture

Markdown islands (headings, fenced code) sitting 4+ columns deep inside nested
plain HTML block tags, separated from the tags by blank lines. The trigger is
structural, not tag-specific: any CommonMark type-6 wrapper chain whose nesting
indent reaches 4 columns puts the island past the indented-code threshold, so
everything after the blank line — fence markers, headings, prose — collapsed
into one literal `<pre>` code block, with closing tags leaking into it.

This body is a stripped-down version of the RM-17560 customer doc:
`<ol>/<li>/<details>/<summary>` at 6-column depth with titled `json` fences.

It also carries the CX-3724 customer snippet: a `<div>` card whose inner island
is wrapped in a non-type-6 tag (`<a>`), which — unlike the type-6 wrappers above —
could not be claimed by the plain-block path. After a blank line its 6-column
`<i>`/`<span>`/`<h3>` body collapsed into a literal `<pre>` code block. The fix
extends the plain-block claim to lowercase non-type-6 wrapper tags when the opener
sits alone on its line (see `isBlockWrapperClaimTagName` in `syntax.ts`).

## Source bugs

- RM-17560 — code samples in `<details>` (inside `<ol>/<li>`) rendered as one
  literal indented-code block in MDXish
- CX-3724 — HTML islands wrapped in non-type-6 tags (`<a>`, `<span>`, `<button>`,
  …) fragmented into literal text when separated by a blank line and indented
  ≥4 effective columns

## What flips this fixture

Changes to the `mdxComponent` tokenizer's plain-block-claim continuation
(`plainClaimLineStart` / the 4-column island rule in
`lib/micromark/mdx-component/syntax.ts`), the block-wrapper claim for
non-type-6 wrapper tags (`isBlockWrapperClaimTagName` /
`blockWrapperOpenerRest` in the same file), the bottom-up promotion recursion
in `processor/transform/mdxish/components/mdx-blocks.ts` (`parseMdChildren` /
`promoteComponentBlocks`), or `safeDeindent`'s shared-indent stripping.
