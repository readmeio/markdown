import * as rdmd from '@readme/markdown-legacy';

import { vi } from 'vitest';

import { run, compile, migrate as baseMigrate } from '../index';

export const silenceConsole =
  (prop: keyof Console = 'error', impl = () => {}) =>
  fn => {
    let spy: ReturnType<typeof vi.spyOn> | undefined;

    try {
      spy = vi.spyOn(console, prop);
      // @ts-expect-error - spy is a spy
      spy.mockImplementation(impl);

      return fn(spy);
    } finally {
      spy?.mockRestore();
    }
  };

export const execute = async (doc: string, compileOpts = {}, runOpts = {}, { getDefault = true } = {}) => {
  const code = await compile(doc, compileOpts);
  const mod = await run(code, runOpts);

  return getDefault ? mod.default : mod;
};

export const migrate = (doc: string) => {
  return baseMigrate(doc, { rdmd });
};
