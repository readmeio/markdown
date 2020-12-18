/* global page */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  updatePassedSnapshot: true,
});

expect.extend({ toMatchImageSnapshot });
