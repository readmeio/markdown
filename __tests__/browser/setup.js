import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const opts = {};
const baseToMatchImageSnapshot = configureToMatchImageSnapshot(opts);

function toMatchImageSnapshot(...args) {
  const { pass, message } = baseToMatchImageSnapshot.bind(this)(...args);
  const { snapshotState } = this;

  // NOTE: this will fail all toMatchImageSnapshot checks! But oh well.
  return pass && snapshotState.added > 0 ? { pass: false, message: () => 'Missing snapshot!' } : { pass, message };
}

expect.extend({ toMatchImageSnapshot });
