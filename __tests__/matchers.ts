import type { Root, Node } from 'mdast';
import type { MatcherResult, MatcherState } from 'vitest';

import { map } from 'unist-util-map';
import { expect } from 'vitest';

const removePosition = ({ position, ...node }: Node) => node;

function toStrictEqualExceptPosition(this: MatcherState, received: Root, expected: Root): MatcherResult {
  const { equals } = this;
  const receivedTrimmed = map(received, removePosition);
  const expectedTrimmed = map(expected, removePosition);

  return {
    pass: equals(receivedTrimmed, expectedTrimmed),
    message: () => 'Expected two trees to be equal!',
    actual: receivedTrimmed,
    expected: expectedTrimmed,
  };
}

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toStrictEqualExceptPosition });
