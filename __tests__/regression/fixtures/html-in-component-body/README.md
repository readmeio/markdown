# `html-in-component-body` Fixture

Html blocks inside component bodies indented by two columns, the shape the
MDXish serializer writes for every JSX child.

## Source bugs

- RM-19815 — html inside a `<Callout>` kept the body's indent in its `value`,
  so the MdxishEditor showed it in rich mode after a raw-mode edit. Bodies under
  four columns skip `safeDeindent`, and CommonMark html blocks keep their
  leading whitespace. The first-line case regressed in #1583 (RM-17790), when
  `.trim()` on the body became `trimBlankEdges`.

## What it proves

- Each html node starts at its `<`, in both renderer and editor modes, like the
  same html in a list item.
- Multi-line html drops only the body indent; deeper lines keep their extra
  indent.
- MDX rejects `<!-- -->`, so the fixture locks in the MDXish render and the
  MDX side is `""`.

## What flips this fixture

`stripHtmlBlockIndent` in `mdx-blocks.ts`, `safeDeindent`'s four-column gate, or
`trimBlankEdges`.
