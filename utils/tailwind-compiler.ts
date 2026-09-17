import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';
import * as tailwindcss from 'tailwindcss';
// @ts-expect-error - these are being imported as strings
import index from 'tailwindcss/index.css';
// @ts-expect-error - these are being imported as strings
import preflight from 'tailwindcss/preflight.css';
// @ts-expect-error - these are being imported as strings
import theme from 'tailwindcss/theme.css';
// @ts-expect-error - these are being imported as strings
import utilities from 'tailwindcss/utilities.css';

/*
 * @note: This is mostly copied from @tailwindcss/browser
 */

async function loadStylesheet(id: string, base: string) {
  function load() {
    if (id === 'tailwindcss') {
      return {
        base,
        content: index,
        path: '',
      };
    } else if (id === 'tailwindcss/preflight' || id === 'tailwindcss/preflight.css' || id === './preflight.css') {
      return {
        base,
        content: preflight,
        path: '',
      };
    } else if (id === 'tailwindcss/theme' || id === 'tailwindcss/theme.css' || id === './theme.css') {
      return {
        base,
        content: theme,
        path: '',
      };
    } else if (id === 'tailwindcss/utilities' || id === 'tailwindcss/utilities.css' || id === './utilities.css') {
      return {
        base,
        content: utilities,
        path: '',
      };
    }

    throw new Error(`The browser build does not support @import for "${id}"`);
  }

  const sheet = load();

  return sheet;
}

async function loadModule(): Promise<never> {
  throw new Error('The browser build does not support plugins or config files.');
}

async function createCompiler({
  darkModeDataAttribute,
  darkModeRootSelector,
}: {
  darkModeDataAttribute?: string | null;
  darkModeRootSelector?: string | null;
}) {
  let css = `
@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
`;

  if (darkModeDataAttribute) {
    // Anchors `dark:` to `darkModeRootSelector`'s own attribute instead of any ancestor's,
    // when supplied — see the `darkModeRootSelector` param doc below for why there's no default.
    const root = darkModeRootSelector || '';
    css += `

@custom-variant dark (&:where(${root}[${darkModeDataAttribute}=dark], ${root}[${darkModeDataAttribute}=dark] *));`;
  }

  return tailwindcss.compile(css, {
    base: '/',
    loadStylesheet,
    loadModule,
  });
}

export async function tailwindCompiler(
  classes: string[],
  {
    prefix,
    darkModeDataAttribute,
    darkModeRootSelector,
  }: {
    darkModeDataAttribute?: string | null;
    /**
     * Scopes the `dark:` variant to `darkModeRootSelector[darkModeDataAttribute=dark]`
     * (self or descendant) instead of matching `[darkModeDataAttribute=dark]` on *any*
     * ancestor. Matches `when-color-mode-dark($root)` in `styles/mixins/when-color-mode-dark.scss`
     * — see that mixin's doc comment for the full rationale (two independent
     * `data-color-mode` scopes on one page, e.g. readme's SuperHub admin shell vs. the
     * hub content it's previewing) and why there's no default: this package ships one
     * precompiled stylesheet, so whatever a caller passes is permanent for every
     * installer, and readme (this package's only real consumer today) is expected to
     * pass its hub color-mode root, `.rm-ReadMe`.
     */
    darkModeRootSelector?: string | null;
    prefix: string;
  },
) {
  const compiler = await createCompiler({ darkModeDataAttribute, darkModeRootSelector });
  const css = compiler.build(Array.from(classes));

  return postcss([prefixer({ prefix })]).process(css, { from: undefined });
}
