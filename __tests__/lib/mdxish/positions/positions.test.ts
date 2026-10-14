import type { MdxishOpts } from '../../../../lib';

import { parseMdxishWithResolvedSources } from '../../../helpers';

import { buildPositionCorpus } from './corpus';
import { isKnownPositionGap, KNOWN_POSITION_GAPS } from './known-gaps';
import { findPositionViolations } from './position-invariant';

const MODES: MdxishOpts[] = [{ newEditorTypes: false }, { newEditorTypes: true }];

const runs = MODES.flatMap(opts =>
  buildPositionCorpus().map(input => {
    const { tree, sourceOf } = parseMdxishWithResolvedSources(input.doc, opts);
    return { input, opts, violations: findPositionViolations(tree, sourceOf) };
  }),
);

describe('mdxish source positions (RM-18923)', () => {
  it.each(runs)('$input.name ($input.variant, newEditorTypes: $opts.newEditorTypes)', ({ input, violations }) => {
    const unexplained = violations.filter(
      violation => !KNOWN_POSITION_GAPS.some(gap => isKnownPositionGap(gap, violation, input)),
    );
    expect(unexplained).toStrictEqual([]);
  });

  it('only lists known gaps that still occur', () => {
    const staleGaps = KNOWN_POSITION_GAPS.filter(
      gap =>
        !runs.some(({ input, violations }) => violations.some(violation => isKnownPositionGap(gap, violation, input))),
    );
    expect(staleGaps.map(gap => gap.reason)).toStrictEqual([]);
  });
});
