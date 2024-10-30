import { vi } from 'vitest';
import { run, compile } from '../index';

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
