import path from 'path';

import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const opts = {
  comparisonMethod: 'ssim',
  customDiffConfig: {
    ssim: 'bezkrovny',
  },
};

if (process.env.CI) {
  opts.customSnapshotsDir = path.resolve('__tests__/browser/ci/');
}

const toMatchImageSnapshot = configureToMatchImageSnapshot(opts);

expect.extend({ toMatchImageSnapshot });
