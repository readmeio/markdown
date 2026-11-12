# `html-code-with-markdown` Fixture

Markdown inside a raw html `<code>` tag: backticks, inline code between text,
bold and emphasis, escaped backticks, and the same tag in a list item and a table cell.

## Source bugs

- RM-16932: MDXish rendered <code>\`hello\`</code> as an empty code box. The backticks
  parse as a nested inline code, so `components/Code` got a React element as its child,
  kept only `children[0]` and handed it to the syntax highlighter, which renders
  non-strings empty. `Code` now renders children that contain markup untouched.

## What it proves

- The text inside every `<code>` renders in both engines, including everything after
  the first child (`a b c`, not just `a `).
- Plain inline code still goes through the highlighter.
- The node test environment has no highlighter, so the empty-box half of the bug is
  covered by `__tests__/components/Code.test.tsx`, which stubs it.

## What flips this fixture

`components/Code/index.tsx`, or how mdxish parses markdown inside inline html.
