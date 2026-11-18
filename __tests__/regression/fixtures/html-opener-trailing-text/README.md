# `html-opener-trailing-text` Fixture

A block-level HTML opener with text after it on the same line (`<li> test`),
directly followed by markdown with no blank line between them.

## Source bugs

- **RM-16379** — a magic block right under `<li> test` rendered as literal text.
  CommonMark opens a type-6 HTML block on the tag name alone, so the trailing
  text didn't stop it from swallowing the lines below. `terminateHtmlFlowBlocks`
  only recognized lone tags or matched open/close pairs, so it never inserted
  the terminating blank line.

## What it proves

- The `[block:parameters]` under `<li> test` renders as a table.
- A heading under a `<div class>` opener with trailing text parses as markdown.
- Openers closed later in the same block (`<li> … </li>`, `<div>**bold**\nmore</div>`)
  are left glued: mdxish already re-parses those whole, so splitting them would
  break the bold and the callout.
- Sibling `<li>`s where only the last is closed still split: the closer
  balances the second `<li>`, so the first one's callout renders.
- An inline tag (`<b> bold text`) is not split from the next line — only
  type-6 block names get the blank line.

The magic block and the unclosed-on-line openers aren't valid MDX, so the MDX side renders `""`.

## What flips this fixture

`leavesBlockTagOpen` / `shouldTerminateBetween` in
`processor/transform/mdxish/terminate-html-flow-blocks.ts`, or
`findBalancedOpenerOffsets` in `processor/transform/mdxish/components/utils.ts`.
