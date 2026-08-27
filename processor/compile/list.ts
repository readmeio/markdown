import type { List, Parents } from 'mdast';
import type { Handle, Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

export const DEFAULT_BULLET = '-';

/** The list markers the readme editor records from source text. */
export type ListMarker = '-' | '.' | ')' | '*' | '+';

/**
 * mdast doesn't record a list's marker, so the readme editor stamps it on the
 * node as this non-standard `marker` field for the handler below to honor.
 */
export type ListWithMarker = List & { marker?: ListMarker };

// Serialize each list with its stamped marker. remark-stringify only reads
// markers from `state.options`, so swap the stamped one in for this list's
// subtree. An unstamped list leaves the options untouched, so a nested list
// inherits the nearest stamped ancestor's marker and matches the document's
// style; a following sibling list can't inherit because the stamped list
// restores the configured defaults in `finally` when it finishes.
const list = ((node: ListWithMarker, parent: Parents | undefined, state: State, info: Info) => {
  const { marker } = node;
  const savedBullet = state.options.bullet;
  const savedBulletOrdered = state.options.bulletOrdered;
  if (marker === '*' || marker === '-' || marker === '+') state.options.bullet = marker;
  if (marker === '.' || marker === ')') state.options.bulletOrdered = marker;
  try {
    return defaultHandlers.list(node, parent, state, info);
  } finally {
    state.options.bullet = savedBullet;
    state.options.bulletOrdered = savedBulletOrdered;
  }
}) satisfies Handle;

export default list;
