import type { List, ListItem } from 'mdast';

import { defaultHandlers } from 'mdast-util-to-markdown';

/**
 * mdxish-specific list-item serializer intended for checklist items.
 *
 * This compiler will use * for checklist items, and ensure that checklist items
 * that have no text after it are serialized as `* [ ]` instead of having the
 * checkbox dropped in the string output.
 */
const listItem = (node: ListItem, parent, state, info) => {
  const head = node.children[0];
  const isCheckbox = typeof node.checked === 'boolean' && head && head.type === 'paragraph';

  if (!isCheckbox) {
    return defaultHandlers.listItem(node, parent, state, info);
  }

  const checkbox = `[${node.checked ? 'x' : ' '}] `;
  // `tracker` keeps current column/offset for downstream line wrapping/indent.
  const tracker = state.createTracker(info);
  // We move it by checkbox length so wrapped lines align after `[ ] ` / `[x] `.
  tracker.move(checkbox);

  // Use the built-in listItem serializer as the source of truth for spacing,
  // indentation, ordered marker formatting, and wrapping behavior.
  // We only patch the leading marker/checkbox portion afterward.
  let value = defaultHandlers.listItem(node, parent, state, {
    ...info,
    ...tracker.current(),
  });

  // Rewrite only the first list marker token (`-`, `+`, `*`, or `1.`):
  // - force `*` for unordered checklist items
  // - preserve ordered markers
  value = value.replace(/^(?:[*+-]|\d+\.)(?:([\r\n]| {1,3})|$)/, (match, separator) => {
    const marker = parent && (parent as List).type === 'list' && !(parent as List).ordered ? '*' : match.trim();
    const actualSeparator = separator || ' ';
    return `${marker}${actualSeparator}${checkbox}`;
  });

  // If we injected into an empty item, remove trailing space after checkbox.
  if (value.endsWith(' ')) {
    value = value.slice(0, -1);
  }

  return value;
};

export default listItem;
