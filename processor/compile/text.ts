import type { Parents, Text } from 'mdast';
import type { Info, State } from 'mdast-util-to-markdown';

import { defaultHandlers } from 'mdast-util-to-markdown';

// A `_` flanked by word characters can never open or close emphasis under
// CommonMark's flanking rules, so the escape mdast-util-to-markdown adds to
// intraword underscores is unnecessary and only produces noisy `\_` diffs.
const INTRAWORD_UNDERSCORE_ESCAPE = /(?<=\w)\\_(?=\w|\\_)/g;

// Literal braces in text carry no expression meaning, but the default handler
// leaves them bare. Re-escape them so they don't parse as (often unterminated)
// MDX expressions on the next round trip. Real expressions/variables are their
// own node types and never reach this handler.
const LITERAL_BRACE = /[{}]/g;

const text = (node: Text, parent: Parents | undefined, state: State, info: Info): string => {
  const serialized = defaultHandlers.text(node, parent, state, info);
  return serialized.replace(INTRAWORD_UNDERSCORE_ESCAPE, '_').replace(LITERAL_BRACE, '\\$&');
};

export default text;
