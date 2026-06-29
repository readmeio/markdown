import type { RenderContext } from './loadFixture';
import type { RMDXModule } from '../../types';

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { compile, run, mdxish, renderMdxish } from '..';


export type Engine = 'mdx' | 'mdxish';

export interface FixtureRenderResult {
  error: string | null;
  html: string;
}

// Frozen timestamp used for deterministic rendering (2024-01-01T00:00:00.000Z)
const FROZEN_NOW = Date.UTC(2024, 0, 1);

/**
 * Wraps a render call with a frozen clock (Date.now and Math.random) so that
 * renders are deterministic.
 *
 * SYNC-ONLY: `fn` must return synchronously. The `finally` block restores the
 * real `Date.now` / `Math.random` the moment `fn` returns, which for a
 * Promise-returning `fn` happens *before* the async work runs — exposing the
 * real clock during render and producing flaky output. If a future engine
 * change makes any of `compile`, `run`, `mdxish`, `renderMdxish`, or
 * `renderToString` async, this helper must be rewritten to await the result
 * before restoring globals. The runtime assertion below fails loudly rather
 * than silently producing non-deterministic renders.
 */
function withFrozenClock<T>(fn: () => T): T {
  const savedNow = Date.now;
  const savedRandom = Math.random;
  Date.now = () => FROZEN_NOW;
  let seed = 1;
  Math.random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  try {
    const result = fn();
    if (
      result !== null &&
      typeof result === 'object' &&
      typeof (result as { then?: unknown }).then === 'function'
    ) {
      throw new Error(
        'withFrozenClock: fn returned a Promise. This helper is sync-only — ' +
          'an async render would restore the real clock before the engine ' +
          'work completes, breaking determinism. Rewrite withFrozenClock to ' +
          'await before restoring globals if any engine becomes async.',
      );
    }
    return result;
  } finally {
    Date.now = savedNow;
    Math.random = savedRandom;
  }
}

/**
 * Build the components map for compile() — MDX compile() accepts
 * `Record<tag, source>` (raw source strings).
 */
function buildMdxSources(
  components: RenderContext['components'],
): Record<string, string> {
  return components.reduce<Record<string, string>>((acc, { tag, source }) => {
    acc[tag] = source;
    return acc;
  }, {});
}

/**
 * Compile each custom block through compile+run to produce RMDXModules.
 * Used by run()'s `components` option and renderMdxish()'s `components` option.
 */
function buildModules(
  components: RenderContext['components'],
): Record<string, RMDXModule> {
  return components.reduce<Record<string, RMDXModule>>((acc, { tag, source }) => {
    const code = compile(source, {});
    acc[tag] = run(code, {}) as RMDXModule;
    return acc;
  }, {});
}

/**
 * Renders a fixture body string through the specified engine and returns the
 * serialized HTML. Renders are deterministic — Date.now and Math.random are
 * frozen for the duration of each render call.
 *
 * For MDXish, the components map is passed to BOTH mdxish() and renderMdxish()
 * — both call sites need it for custom-block resolution.
 *
 * The loader's `ctx.glossary` is mapped onto the engine's `terms` parameter.
 */
export function renderFixture(
  body: string,
  ctx: RenderContext,
  engine: Engine,
): FixtureRenderResult {
  return withFrozenClock(() => {
    try {
      if (engine === 'mdx') {
        const code = compile(body, {
          useTailwind: true,
          components: buildMdxSources(ctx.components),
        });
        const mod = run(code, {
          components: buildModules(ctx.components),
          variables: ctx.variables,
          terms: ctx.glossary,
        }) as RMDXModule;
        return { html: renderToString(createElement(mod.default)), error: null };
      }

      const modules = buildModules(ctx.components);
      // components AND variables MUST be passed to mdxish() — components for
      // custom-block resolution, variables for the variablesCodeResolver pass
      // that resolves <<...>> and {user.*} inside inline/fenced code at parse
      // time. renderMdxish() also needs them for non-code-context resolution.
      const tree = mdxish(body, {
        useTailwind: true,
        components: modules,
        variables: ctx.variables,
      });
      const mod = renderMdxish(tree, {
        components: modules,
        variables: ctx.variables,
        terms: ctx.glossary,
      });
      return { html: renderToString(createElement(mod.default)), error: null };
    } catch (err) {
      return {
        html: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
