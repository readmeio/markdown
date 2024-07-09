import { Plugin } from 'unified';

export function profileTransformer(transformer: Plugin) {
  if (!process.env.PROFILE) return transformer;

  return function (...opts: unknown[]) {
    const proc = transformer(...opts);
    if (!proc) return;

    return function (...args: unknown[]) {
      console.time(transformer.name);

      const ret = proc.call(this, ...args);
      console.timeEnd(transformer.name);

      return ret;
    };
  };
}
