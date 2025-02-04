interface CustomMatchers<R = unknown> {
  toStrictEqualExceptPosition: () => R;
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
