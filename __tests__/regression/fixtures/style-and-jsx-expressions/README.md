# `style-and-jsx-expressions` Fixture

There was some rendering issues with content that contains big and complex `<style>{`...`}</style>` template literal, 
`style={{...}}` object expression, and a `.map()` callback that returns nested JSX
- including an outer `<a>` card wrapping an inner `<a>` link, which is invalid HTML nesting 
that a real render still has to preserve rather than collapse or drop. In these cases the
styling might not get applied or the HTML UI doesn't render properly

## Source bugs

- CX-3646 / PR #1532 — `<style>{`...`}</style>` template literals, `style={{...}}`
  object expressions, and basic `.map()` → JSX all rendered correctly under MDX
  but broke silently when force-migrated to MDXish.
- PR #1538 — follow-up MDXish gaps: nested `.map()` blocks, component
  fall-through, and JSX expressions that return content violating the HTML
  content model (e.g. `<a>` wrapping `<a>`, `<div>` wrapping `<p>`). See
  `__tests__/lib/mdxish/style-and-jsx-expressions.test.ts` for the exhaustive
  unit-level cases this fixture is a representative slice of.

## What it covers

| Feature | Where in `body.md` |
|---------|---------------------|
| `<style>{`...`}</style>` template literal | Top-level `<style>` block |
| `style={{...}}` object expression | `style={{ display: "grid" }}` on the wrapping `<div>` |
| `.map()` returning JSX | Outer `.map()` over the two card objects |
| Nested `.map()` | Inner `.map()` over each card's `items` |
| Invalid HTML nesting preserved | Outer `<a className="card-link">` wraps a `<div>` that itself contains an inner `<a>` |

## What flips this fixture

Changes to `evaluate-expressions.ts`, `react-element-to-hast.ts`, or the
MDXish `<style>`/JSX-expression evaluation path. If a future change causes
MDXish to drop the inner `<a>`, serialize `style` as `[object Object]`, or
collapse the nested `.map()` output, this fixture's per-engine snapshot
(`snapshots.test.ts`) will flip first.
