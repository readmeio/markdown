import { configureToMatchImageSnapshot } from 'jest-image-snapshot';

const toMatchImageSnapshot = configureToMatchImageSnapshot({});

expect.extend({ toMatchImageSnapshot });
