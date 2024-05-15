import { expect } from 'vitest';
import { map } from 'unist-util-map';

const removePosition = ({ position, ...node }) => node;

function toStrictEqualExceptPosition(received, expected) {
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
