import type { ListItem } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';

/**
 * Normalizes list items that are written as only `[ ]` or `[x]` into GFM task
 * list items during parse, but only when at least one whitespace character
 * follows the closing bracket (`]`). This matches legacy behaviour for checkboxes
 *
 * The issue is `remark-gfm` does not actually classify these as task items when they have no content
 * after the checkbox, which leaves them as plain text (`"[ ]"`). So a custom extension is needed to
 * treat these as task items
 */
function exitListItemWithEmptyTaskListItem(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1];

  if (
    node &&
    node.type === 'listItem' &&
    typeof (node as ListItem).checked !== 'boolean'
  ) {
    const listItem = node as ListItem;
    const head = listItem.children[0];

    if (head && head.type === 'paragraph' && head.children.length === 1) {
      const text = head.children[0];
      if (text.type === 'text') {
        const hasTrailingWhitespace =
          typeof head.position?.end.offset === 'number' &&
          typeof text.position?.end.offset === 'number' &&
          head.position.end.offset > text.position.end.offset;

        if (!hasTrailingWhitespace) {
          this.exit(token);
          return;
        }

        const value = text.value;
        if (value === '[ ]') {
          listItem.checked = false;
          head.children = [];
        } else if (value === '[x]' || value === '[X]') {
          listItem.checked = true;
          head.children = [];
        }
      }
    }
  }

  this.exit(token);
}

export function emptyTaskListItemFromMarkdown(): FromMarkdownExtension {
  return {
    exit: {
      listItem: exitListItemWithEmptyTaskListItem,
    },
  };
}
