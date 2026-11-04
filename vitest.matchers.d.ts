// Not `vitest.d.ts`: with `baseUrl` set to ".", that filename replaces the `vitest` module.
// oxlint-disable-next-line import/no-unassigned-import
import 'vitest';

declare module 'vitest' {
  interface Matchers<R extends Promise<void> | void = Promise<void> | void, T = unknown> {
    toStrictEqualExceptPosition: (expected: T) => R;
  }
}
