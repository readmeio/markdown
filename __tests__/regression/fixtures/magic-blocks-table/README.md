# `magic-blocks-table` Fixture

Two consecutive `[block:parameters]` magic blocks where the first contains
an unclosed `<li>` in its JSON body and the second contains a matching
`</li>`.

## Source bugs

- PR #1452 — first magic block in pair not rendering when its content has HTML tags
- PR #1451 — bunched-up magic blocks under a list item not rendering, order leaked
- MDXish serializer emitted `<Table>` JSX with blank lines, breaking rendering on multi-paragraph cells

## MDX side is empty by design

`[block:parameters]` is MDXish-flavored legacy syntax — strict MDX throws on
it. The committed `magic-blocks-table (mdx) 1` snapshot is `""`. The
MDXish-side snapshot is the real regression contract; an MDX-side flip from
`""` to anything else would itself be worth investigating.

## What flips this fixture

`escapeProblematicBraces` regex changes, the magic-block transformer's
parent-children snapshot logic, or any change to consecutive-block lifting
in `magic-block-transformer.ts`.
