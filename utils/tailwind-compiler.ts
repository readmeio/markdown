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

async function createCompiler({ darkModeDataAttribute }: { darkModeDataAttribute?: string | null }) {
  let css = `
@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
`;

  if (darkModeDataAttribute) {
    css += `

@custom-variant dark (&:where([${darkModeDataAttribute}=dark], [${darkModeDataAttribute}=dark] *));`;
  }

  return tailwindcss.compile(css, {
    base: '/',
    loadStylesheet,
    loadModule,
  });
}

export async function tailwindCompiler(
  classes: string[],
  { prefix, darkModeDataAttribute }: { darkModeDataAttribute?: string | null; prefix: string },
) {
  const compiler = await createCompiler({ darkModeDataAttribute });
  const css = compiler.build(Array.from(classes));

  return postcss([prefixer({ prefix })]).process(css, { from: undefined });
}
