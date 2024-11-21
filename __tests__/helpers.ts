import { vi } from 'vitest';
import * as rdmd from '@readme/markdown-legacy';
import { run, compile, migrate as baseMigrate } from '../index';

export const silenceConsole =
  (prop: keyof Console = 'error', impl = () => {}) =>
  fn => {
    let spy;

    try {
      spy = vi.spyOn(console, prop).mockImplementation(impl);

      return fn(spy);
    } finally {
      spy.mockRestore();
    }
  };

export const execute = async (doc: string, compileOpts = {}, runOpts = {}) => {
  const code = compile(doc, compileOpts);
  const module = await run(code, runOpts);
  return module.default;
};

export const migrate = (doc: string) => {
  return baseMigrate(doc, { rdmd });
};
