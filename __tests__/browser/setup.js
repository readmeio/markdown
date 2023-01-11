import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const opts = {};

const toMatchImageSnapshot = configureToMatchImageSnapshot(opts);

expect.extend({ toMatchImageSnapshot });
