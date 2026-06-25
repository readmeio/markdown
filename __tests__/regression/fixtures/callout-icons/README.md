# `callout-icons` Fixture

A blockquote-syntax callout (`> 📘 …`) followed by a JSX `<Callout>` that
carries a Font Awesome class icon (`icon="far fa-car-bolt"`). Locks in callout
rendering across both engines, including the FA-class icon path.

## Source bugs

- PR #1498 — reworked the MDXish callout serializer to always compile callouts
  to `<Callout>` JSX (persisting `icon`/`theme` selections) and centralized
  Icon rendering so Font Awesome icons apply. This fixture is the render-side
  companion suggested in PR #1489 review: it pins how each engine renders both
  the legacy blockquote callout and an FA-icon JSX callout.

> **Scope note:** PR #1498's headline blockquote-→-JSX change is in the
> *serialize* path (`mdxishMdastToMd`, mdast → markdown), which this
> render-only suite (markdown → HTML) does not exercise. What this fixture
> locks in is the **render** of both callout shapes, which is the axis these
> suites can observe.

## What it proves

- Both engines render the blockquote callout identically as
  `<blockquote class="callout callout_info" theme="📘"><span class="callout-icon">📘</span>…`.
- Both render the FA-class icon onto the callout-icon span
  (`<span class="callout-icon callout-icon_fa far fa-car-bolt">`).
- Suite B reports a single `differ`/`structural` change: MDXish wraps the JSX
  `<Callout>` in `<div class="readme-tailwind">` while MDX does not, so the
  second callout node is a `div` on the right and a `blockquote` on the left.

## What flips this fixture

The callout transformer, the `callout-icon` / Font Awesome class mapping, or
the `readme-tailwind` wrapper applied to JSX components on the MDXish side.
