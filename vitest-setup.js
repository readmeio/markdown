/* eslint-disable import/no-extraneous-dependencies */
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

import './__tests__/matchers';

// jsdom doesn't implement ResizeObserver, which react-zoom-pan-pinch (the image
// lightbox zoom/pan engine) instantiates on mount. Stub it for all tests.
const noop = () => undefined;
// eslint-disable-next-line no-undef
globalThis.ResizeObserver ??= class {
  observe = noop;

  unobserve = noop;

  disconnect = noop;
};
