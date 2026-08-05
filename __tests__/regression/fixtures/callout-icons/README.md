# `callout-icons` Fixture

The same callout authored two ways — once as a blockquote-syntax callout
(`> 📘 …`) and once as the equivalent JSX `<Callout icon="📘" theme="info">` —
pinning how each engine renders the two forms against each other.

## Source bugs

- PR #1498 — reworked the MDXish callout serializer to always compile callouts
  to `<Callout>` JSX (persisting `icon`/`theme` selections) instead of the
  legacy blockquote. This fixture is the render-side companion suggested in the
  PR #1489 review (kevinports), using that review's own example: the blockquote
  `> 📘 Heading` form alongside the JSX `<Callout icon="📘">` form.

> **Scope note:** PR #1498's headline change — emitting `<Callout>` JSX instead
> of the legacy `> 📘` blockquote — is in the *serialize* path
> (`mdxishMdastToMd`, mdast → markdown), which this render-only suite
> (markdown → HTML) does not exercise. This fixture locks in the **render** of
> both callout shapes, which is the axis these suites can observe. An emoji
> icon is used deliberately: it renders identically regardless of the callout
> icon internals, keeping the fixture stable.

## What it proves

- Within each engine, the blockquote callout and the JSX callout render to the
  same shape — `<blockquote class="callout callout_info" theme="📘"><span
  class="callout-icon">📘</span><h3>Heading</h3><p>Body</p></blockquote>` —
  confirming the two authoring forms converge on one rendered callout.
- Suite B reports a single `differ`/`structural` change: MDXish wraps the JSX
  `<Callout>` (`/blockquote[2]`) in `<div class="readme-tailwind">` while MDX
  does not, so that node is a `div` on the right and a `blockquote` on the left.
  The blockquote-form callout (`/blockquote[1]`) is convergent.

## What flips this fixture

The callout transformer, the emoji `callout-icon` rendering, or the
`readme-tailwind` wrapper applied to JSX components on the MDXish side.
