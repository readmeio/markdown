# `indented-markdown-islands-in-html` Fixture

Markdown islands (headings, fenced code) sitting 4+ columns deep inside nested
plain HTML block tags, separated from the tags by blank lines. The trigger is
structural, not tag-specific: any CommonMark type-6 wrapper chain ends at the
blank line, so everything after it — fence markers, headings, prose — used to
collapse into one literal `<pre>` code block (indented code is disabled now,
see `indented-content-is-not-code`), with closing tags leaking into it. Today
the islands parse as markdown; this fixture locks in that they render fully
(headings, CodeTabs) with the wrapper's raw fragments in balanced order, so
the browser DOM re-nests them.

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

Re-enabling the `codeIndented` construct (`disableIndentedCode` in
`processor/utils.ts`), changes to the `mdxComponent` tokenizer's
plain-block-claim continuation (`plainClaimLineStart`) or the block-wrapper
claim for non-type-6 wrapper tags (`isBlockWrapperClaimTagName` /
`blockWrapperOpenerRest`) in `lib/micromark/mdx-component/syntax.ts`, the
bottom-up promotion recursion in
`processor/transform/mdxish/components/mdx-blocks.ts` (`parseMdChildren` /
`promoteComponentBlocks`), or `safeDeindent`'s shared-indent stripping.

The snapshot shape changed when the post-blank 4-column island bypass was
removed from `plainClaimLineStart`: islands now fall back to CommonMark and
render between the wrapper's raw fragments instead of being re-nested in the
HAST. The two shapes were verified DOM-equivalent through parse5.
