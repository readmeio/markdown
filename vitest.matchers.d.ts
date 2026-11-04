// Not `vitest.d.ts`: with `baseUrl` set to ".", that filename replaces the `vitest` module.
import 'vitest';

declare module 'vitest' {
  interface Matchers<R extends Promise<void> | void = Promise<void> | void, T = unknown> {
    toStrictEqualExceptPosition: (expected: T) => R;
  }
}
