import * as rdmd from '@readme/markdown-legacy';

import { vi } from 'vitest';

import { run, compile, migrate as baseMigrate } from '../index';

export const silenceConsole =
  (prop: keyof Console = 'error', impl = () => {}) =>
  fn => {
    const spy: ReturnType<typeof vi.spyOn> = vi.spyOn(console, prop);

    try {
      spy.mockImplementation(impl);

      return fn(spy);
    } finally {
      spy?.mockRestore();
    }
  };

export const execute = (doc: string, compileOpts = {}, runOpts = {}, { getDefault = true } = {}) => {
  const code = compile(doc, compileOpts);
  const mod = run(code, runOpts);

  return getDefault && 'default' in mod ? mod.default : mod;
};

export const migrate = (doc: string) => {
  return baseMigrate(doc, { rdmd });
};
