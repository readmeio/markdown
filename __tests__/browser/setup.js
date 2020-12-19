import { configureToMatchImageSnapshot } from 'jest-image-snapshot';
import path from 'path';

const opts = {};

if (process.env.CI) {
  opts.customSnapshotsDir = path.resolve('__tests__/browser/ci/');
}

const toMatchImageSnapshot = configureToMatchImageSnapshot(opts);

expect.extend({ toMatchImageSnapshot });
