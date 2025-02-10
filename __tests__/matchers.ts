import type { ExpectationResult } from '@vitest/expect';
import type { Root, Node } from 'mdast';

import { map } from 'unist-util-map';

import { expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const removePosition = ({ position, ...node }: Node) => node;

function toStrictEqualExceptPosition(received: Root, expected: Root): ExpectationResult {
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

expect.extend({ toStrictEqualExceptPosition });
