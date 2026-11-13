# `inline-component-escapes` Fixture

Escaped markdown, encoded tags and soft line breaks inside the inline
`<Anchor>` and `<Glossary>` components.

## Source bugs

- [RM-19073](https://linear.app/readme-io/issue/RM-19073): MDXish re-parsed the
  text children of inline components in `rehypeMdxishComponents`, after the
  markdown parser had already parsed them. `\*lit\*` came back as
  `<p><em>lit</em></p>`, `&lt;b&gt;` as a real `<b>`, and everything after a
  soft line break was dropped.

## What it proves

- Escaped `*`/`_` and encoded tags stay literal text inside `<Anchor>` and `<Glossary>`.
- The text after a soft line break is kept.
- The same holds for an `<Anchor>` in a list item, a table cell, a callout and
  single-line raw html, which reach the plugin by different paths.
- Real inline markdown (bold, emphasis) inside an `<Anchor>` still renders.
- Suite B reports only the `<br>` MDXish emits for the soft line break, which it
  does in every paragraph, not just inside components.

## What flips this fixture

`PARSED_CHILDREN_COMPONENTS` in `processor/plugin/mdxish-components.ts`, or the
inline tokenizing of `INLINE_COMPONENT_TAGS` in `lib/constants.ts`.
