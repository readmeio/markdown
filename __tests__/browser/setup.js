import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const opts = {
  comparisonMethod: 'ssim',
  customDiffConfig: {
    ssim: 'bezkrovny',
  },
};
const toMatchImageSnapshot = configureToMatchImageSnapshot(opts);

expect.extend({ toMatchImageSnapshot });
