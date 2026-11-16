# `indented-foreign-html-tags` Fixture

Inline `<svg>` icons authored inside indented, blank-line-separated HTML wrappers
(an icon-card grid) rendered as broken, visible markup instead of graphics. The
shape that breaks is specifically: foreign-content tags (`svg`/`math`) whose
namespaced children (`<path>`, `<rect>`, `<polyline>`, `<ellipse>`) sit several
columns deep inside a plain HTML wrapper, separated by blank lines.

## Source bugs

- RM-17505 / PR #1557 — two independent bugs mangled the same content:
  1. **Children deleted** — `rehypeMdxishComponents` treated namespaced SVG/MathML
     children as unknown components and stripped them. Fixed by skipping
     `FOREIGN_CONTENT_TAGS` subtrees (`processor/plugin/mdxish-components.ts`).
  2. **Fragmented into a code block** — a blank line ends a CommonMark HTML block,
     so the children spilled out and, being 4+ columns deep, were re-parsed as
     indented code. Fixed by `collapseForeignContentBlankLines`, which drops blank
     lines inside SVG/MathML islands before parsing.

  Both surfaced once HTML wrappers began re-parsing their (deindented) bodies —
  see PR #1545 and PR #1554, which moved plain HTML bodies back through the
  Markdown parser, where indentation and blank lines carry meaning that raw HTML
  nodes never gave them.

## What it covers

| Feature | Where in `body.md` |
|---------|---------------------|
| SVG children preserved, not stripped as unknown components | All four `<svg>` icons — 13 `<path>`, 2 `<polyline>`, 1 `<rect>`, 1 `<ellipse>` |
| Blank lines inside an SVG island | Every `<svg>` separates its children with blank lines |
| Deeply indented foreign content | `<path>` etc. sit 8 columns deep, past CommonMark's 4-column indented-code threshold |
| Blank lines between siblings in a plain HTML wrapper | Blank lines between `<div class="wrike-card-icon">` and the card title/desc `<div>`s |
| Markdown-adjacent inline content beside foreign tags | `<span class="wrike-arrow">→</span>` inside each card link |

## What flips this fixture

Changes to `collapse-foreign-content-blank-lines.ts`, the `FOREIGN_CONTENT_TAGS`
skip in `processor/plugin/mdxish-components.ts`, or the HTML-body re-parse path
(`safeDeindent` / `parseMdChildren` in `mdx-blocks.ts`, `terminate-html-flow-blocks.ts`).

If a regression reintroduces either bug, the MDXish per-engine snapshot
(`snapshots.test.ts`) flips first — a stripped-children regression drops the
`<path>`/`<rect>` counts, and a fragmentation regression introduces `<pre><code>`
where the icons should be. Both engines currently agree on the element counts, so
the Suite B equivalence diff is also sensitive to either failure.
