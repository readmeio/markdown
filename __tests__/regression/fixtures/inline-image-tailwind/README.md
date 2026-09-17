# `inline-image-tailwind` Fixture

Pins how an `<Image>` (and other custom components) wrap in the tailwind
`<TailwindRoot>` depending on whether they sit inline or block, across both
engines.

## Source bug

- RM-18331 — After moving from MDX to MDXish, an inline
  `<Image>` (e.g. `text <Image /> text`) rendered on its own line. MDXish tokenizes
  the inline `<Image>` as a flow element, so the tailwind transformer wrapped it in a
  block `<div class="readme-tailwind">`; a `<div>` inside a `<p>` is split out by the
  browser, breaking inline flow. The fix derives the wrapper's `flow` from the parent's
  content model (`INLINE_ONLY_PARENT_TYPES`), so an inline component gets an inline
  `<span>` wrapper and matches MDX.

## What it covers

- An inline `<Image>` flanked by text — stays inline (`span` wrapper).
- An `<Image>` on its own line between text, and one separated by blank lines —
  stay block (`div` wrapper); this is the unchanged behavior guarded against
  regression.
- A plain HTML `<span>` — never wrapped, always inline (control).

The inline/block generalization to other custom components and HTML tags is
covered directly at the AST level in `__tests__/transformers/tailwind.test.tsx`.
