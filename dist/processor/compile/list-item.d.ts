import type { List, ListItem } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';
/**
 * List-item serializer intended for checklist items
 * Uses the default listItem handler for formatting, then patches the output to inject the checkbox and preserve empty items
 *
 * The current aim is to ensure checklist items that have no text after the checkbox are serialized
 * with their checkbox intact (for example, `- [ ]`) instead of dropping it
 * We can add more adjustments if needed
 */
declare const listItem: (node: ListItem, parent?: List, state?: State, info?: Info) => string;
export default listItem;
