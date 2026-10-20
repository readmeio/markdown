import type { Heading, Parents } from 'mdast';
import type { Handle, Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

import { explicitHeadingId } from '../utils';

const SETEXT_UNDERLINE_REGEX = /\n(?:=+|-+)$/;

/** Writes an explicit heading id back as ` {#id}`. A setext heading, written for a line break, can't carry one. */
const heading = ((node: Heading, parent: Parents | undefined, state: State, info: Info) => {
  const markdown = defaultHandlers.heading(node, parent, state, info);
  const id = explicitHeadingId(node);
  return id && !SETEXT_UNDERLINE_REGEX.test(markdown) ? `${markdown} {#${id}}` : markdown;
}) satisfies Handle;

export default heading;
