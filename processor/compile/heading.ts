import type { Heading, Parents } from 'mdast';
import type { Handle, Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

import { explicitHeadingId } from '../utils';

const SETEXT_UNDERLINE_REGEX = /\n(?:=+|-+)$/;

/** Writes an explicit heading id back as `{#id}`, appended to the output so its `{` isn't escaped. */
const heading = ((node: Heading, parent: Parents | undefined, state: State, info: Info) => {
  const markdown = defaultHandlers.heading(node, parent, state, info);
  const id = explicitHeadingId(node);
  if (!id) return markdown;

  const suffix = ` {#${id}}`;
  if (!SETEXT_UNDERLINE_REGEX.test(markdown)) return `${markdown}${suffix}`;

  // A setext heading ends with its underline, so the id goes on the line above it.
  const underline = markdown.lastIndexOf('\n');
  return `${markdown.slice(0, underline)}${suffix}${markdown.slice(underline)}`;
}) satisfies Handle;

export default heading;
