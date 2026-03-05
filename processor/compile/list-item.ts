import type { List, ListItem } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

// Matches '*', '-', '+', '1.', '2.', '3.', etc. followed by a newline or 1-3 spaces
// to be replaced with the marker and a space like `- [ ]`
const listMarkerRegex = /^(?:[*+-]|\d+\.)(?:([\r\n]| {1,3})|$)/;

/**
 * List-item serializer intended for checklist items
 * Uses the default listItem handler for formatting, then patches the output to inject the checkbox and preserve empty items
 *
 * The current aim is to ensure checklist items that have no text after the checkbox are serialized
 * with their checkbox intact (for example, `- [ ]`) instead of dropping it
 * We can add more adjustments if needed
 */
const listItem = (node: ListItem, parent?: List, state?: State, info?: Info) => {
  const head = node.children[0];
  const isCheckbox = typeof node.checked === 'boolean' && head && head.type === 'paragraph';
  if (!isCheckbox) {
    return defaultHandlers.listItem(node, parent, state, info);
  }

  const checkbox = `[${node.checked ? 'x' : ' '}] `;

  // `tracker` keeps current column/offset for downstream line wrapping/indent
  // We move it by checkbox length so wrapped lines align after `[ ] ` / `[x] `
  const tracker = state.createTracker(info);
  tracker.move(checkbox);
  // Initialize the checkbox item with the default listItem serializer as the source of truth for spacing,
  // indentation, ordered marker formatting, and wrapping behavior
  let value = defaultHandlers.listItem(node, parent, state, {
    ...info,
    ...tracker.current(),
  });

  // Patch and inject checkbox after the list marker token
  value = value.replace(listMarkerRegex, (match, separator) => {
    const marker = match.trim();
    const actualSeparator = separator || ' ';
    return `${marker}${actualSeparator}${checkbox}`;
  });

  return value;
};

export default listItem;
