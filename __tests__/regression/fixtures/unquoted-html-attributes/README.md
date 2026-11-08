# `unquoted-html-attributes` Fixture

Native HTML tags whose attribute values are unquoted, plus near-miss prose
that must stay text.

## Source bugs

- **RM-16375** — `<a href=https://example.com>` rendered as literal text with a
  broken autolink. micromark's html-text/html-flow end an unquoted value at `/`,
  so any URL value failed the tag and GFM autolinked the remainder.
- **RM-16375 review** — an earlier fix admitted raw tags (`pre`, `script`,
  `textarea`) into JSX body scanning, treated `<input.value=foo>` as an element,
  and stopped claiming `<a title={…} href=…>` as one JSX element.

## What it proves

- Inline and self-closing tags keep URL / path values as attributes.
- A block tag with a URL value still wraps its blank-line separated content.
- `<input.value=foo>`, `<key=value>` and `<a = b>` stay visible text.
- A brace-bearing lowercase tag still renders as a single link.
- A raw `<pre>` body is left to html-flow, so the heading after it still renders.

## What flips this fixture

`lib/micromark/mdx-component/html-open-tag.ts`, or the brace-gate / self-close
handling in `lib/micromark/mdx-component/syntax.ts`.

The MDX engine renders `""` because strict JSX rejects the near-miss prose
(`<key=value>`, `<a = b>`), so Suite B reports every node as extra.
