import type { MdxishOpts } from '../../../../lib';

import { parseMdxishWithSource } from '../../../helpers';

import { buildPositionCorpus } from './corpus';
import { findPositionViolations } from './position-invariant';

const MODES: MdxishOpts[] = [{ newEditorTypes: false }, { newEditorTypes: true }];

const runs = MODES.flatMap(opts => buildPositionCorpus().map(input => ({ input, opts })));

describe('mdxish source positions (RM-18923)', () => {
  it.each(runs)('$input.name ($input.variant, newEditorTypes: $opts.newEditorTypes)', ({ input, opts }) => {
    const { tree, source } = parseMdxishWithSource(input.doc, opts);
    expect(findPositionViolations(tree, () => source)).toStrictEqual([]);
  });
});
