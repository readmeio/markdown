import { describe, expect, it, vi } from 'vitest';

// The real `tailwindcss.compile()` needs this package's production build pipeline
// (CSS files imported as raw strings) to produce actual utility output — that
// pipeline isn't wired up under vitest (see TailwindStyle.test.tsx, which mocks
// `tailwindCompiler` entirely for the same reason). Spy on `compile` instead, to
// unit-test the `@custom-variant dark (...)` string this file builds without
// depending on a full real compile.
const compileSpy = vi.fn().mockReturnValue({ build: () => '' });
vi.mock('tailwindcss', () => ({ compile: (...args: unknown[]) => compileSpy(...args) }));

// eslint-disable-next-line import/first
import { tailwindCompiler } from '../../utils/tailwind-compiler';

describe('tailwindCompiler', () => {
  describe('darkModeRootSelector', () => {
    it('scopes the dark: variant to the root selector, self or descendant, when supplied', async () => {
      await tailwindCompiler(['dark:bg-red-500'], {
        prefix: '.tw',
        darkModeDataAttribute: 'data-color-mode',
        darkModeRootSelector: '.rm-ReadMe',
      });

      const [css] = compileSpy.mock.calls.at(-1) as [string];
      expect(css).toContain(
        '@custom-variant dark (&:where(.rm-ReadMe[data-color-mode=dark], .rm-ReadMe[data-color-mode=dark] *));',
      );
    });

    it('falls back to matching any ancestor when omitted, unchanged from before this option existed', async () => {
      await tailwindCompiler(['dark:bg-red-500'], {
        prefix: '.tw',
        darkModeDataAttribute: 'data-color-mode',
      });

      const [css] = compileSpy.mock.calls.at(-1) as [string];
      expect(css).toContain('@custom-variant dark (&:where([data-color-mode=dark], [data-color-mode=dark] *));');
    });

    it('does not scope dark mode at all when darkModeDataAttribute is omitted, root selector or not', async () => {
      await tailwindCompiler(['dark:bg-red-500'], {
        prefix: '.tw',
        darkModeRootSelector: '.rm-ReadMe',
      });

      const [css] = compileSpy.mock.calls.at(-1) as [string];
      expect(css).not.toContain('@custom-variant');
      expect(css).not.toContain('.rm-ReadMe');
    });
  });
});
