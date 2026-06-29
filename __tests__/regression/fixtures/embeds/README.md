# `embeds` Fixture

Four `<Embed>` variants without prerendered `html` fields — the shape
MdxishEditor emits. Without the PR #1476 fix, all four rendered as link
cards in view mode despite working correctly in the editor.

## Source bugs

- PR #1476 — iframe / YouTube / PDF / jsfiddle embeds rendered as link cards instead of iframes when `html` was absent

## What flips this fixture

Changes to the `Embed` view-mode renderer's branch logic, the `typeOfEmbed`
discriminator handling, or the `html` / `iframe` fallback chain.
