# `multiline-jsx-expressions` Fixture

A `{...}` expression whose JSX branch sat on its own line rendered as three broken blocks in
MDXish: the paragraph `{cond ? (`, the component, then `) : null}` as literal text. The same
expression on one line, or under MDX, rendered fine.

## Source bugs

- RM-18244 / PR #1609 — the lenient `{}` tokenizer only had a text (inline) construct, so a
  `<Component>` at the start of a line ended the paragraph and split the run. The PR adds a
  flow construct that keeps the run together, and reconciles the result's block/inline slot
  (`<p>` wrapping and lifting) so formatting an expression across lines doesn't change the
  output. See `__tests__/lib/micromark/mdx-expression-lenient.test.ts` and
  `__tests__/transformers/evaluate-expressions.test.ts` for the unit-level cases.

## What it covers

| Feature | Where in `body.md` |
|---------|---------------------|
| Multiline conditional returning a component | First section |
| `.map()` returning JSX, with and without a blank line in the callback | "A list rendered from data", "A callback body…" |
| Inline element / text result wrapped in a `<p>` | "Inline and text results…" |
| Multiline expressions inside `<Tabs>`, `<Accordion>`, a custom `<Card>`, and a `<Table>` cell | "Inside components" |
| Lone `{user.x}` lines kept bare (no `<p>`), in a component and at the root | "Lone variables stay bare" |

## What flips this fixture

Changes to `lib/micromark/mdx-expression-lenient/syntax.ts` (the flow construct and its line
lookahead), `evaluate-expressions.ts` (block/inline placement), or `variables-text.ts`. If a
future change splits a multiline run again, wraps a lone variable in a `<p>`, or leaves a block
result inside a `<p>`, the MDXish per-engine snapshot (`snapshots.test.ts`) will flip first.
