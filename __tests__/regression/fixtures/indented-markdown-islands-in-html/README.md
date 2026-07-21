# `indented-markdown-islands-in-html` Fixture

Markdown islands (headings, fenced code) sitting 4+ columns deep inside nested
plain HTML block tags, separated from the tags by blank lines. The trigger is
structural, not tag-specific: any CommonMark type-6 wrapper chain whose nesting
indent reaches 4 columns puts the island past the indented-code threshold, so
everything after the blank line — fence markers, headings, prose — collapsed
into one literal `<pre>` code block, with closing tags leaking into it.

This body is a stripped-down version of the RM-17560 customer doc:
`<ol>/<li>/<details>/<summary>` at 6-column depth with titled `json` fences.

## Source bugs

- RM-17560 — code samples in `<details>` (inside `<ol>/<li>`) rendered as one
  literal indented-code block in MDXish

## What flips this fixture

Changes to the `mdxComponent` tokenizer's plain-block-claim continuation
(`plainClaimLineStart` / the 4-column island rule in
`lib/micromark/mdx-component/syntax.ts`), the bottom-up promotion recursion in
`processor/transform/mdxish/components/mdx-blocks.ts` (`parseMdChildren` /
`promoteComponentBlocks`), or `safeDeindent`'s shared-indent stripping.
