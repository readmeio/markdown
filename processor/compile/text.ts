import type { Parents, Text } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

import { escapeCellStartBlockMarker } from './table-cell-block-markers';

// A `_` flanked by word characters can never open or close emphasis under
// CommonMark's flanking rules, so the escape mdast-util-to-markdown adds to
// intraword underscores is unnecessary and only produces noisy `\_` diffs.
// Uses Unicode letter/number classes so non-ASCII words (e.g. `é_pay`) match.
const INTRAWORD_UNDERSCORE_ESCAPE = /(?<=[\p{L}\p{N}_])\\_(?=[\p{L}\p{N}_]|\\_)/gu;

export const text = (node: Text, parent: Parents | undefined, state: State, info: Info): string => {
  const serialized = defaultHandlers.text(node, parent, state, info);
  return escapeCellStartBlockMarker(serialized, node, parent, state, info);
};

const mdxishText = (node: Text, parent: Parents | undefined, state: State, info: Info): string =>
  text(node, parent, state, info).replace(INTRAWORD_UNDERSCORE_ESCAPE, '_');

export default mdxishText;
