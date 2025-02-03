import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';

import * as tailwindcss from 'tailwindcss';

// @ts-ignore
import index from 'tailwindcss/index.css';
// @ts-ignore
import preflight from 'tailwindcss/preflight.css';
// @ts-ignore
import theme from 'tailwindcss/theme.css';
// @ts-ignore
import utilities from 'tailwindcss/utilities.css';

/*
 * @note: This is mostly copied from @tailwindcss/browser
 */
async function createCompiler() {
  const css = `
@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
`;

  return await tailwindcss.compile(css, {
    base: '/',
    loadStylesheet,
    loadModule,
  });
}

async function loadStylesheet(id: string, base: string) {
  function load() {
    if (id === 'tailwindcss') {
      return {
        base,
        content: index,
      };
    } else if (id === 'tailwindcss/preflight' || id === 'tailwindcss/preflight.css' || id === './preflight.css') {
      return {
        base,
        content: preflight,
      };
    } else if (id === 'tailwindcss/theme' || id === 'tailwindcss/theme.css' || id === './theme.css') {
      return {
        base,
        content: theme,
      };
    } else if (id === 'tailwindcss/utilities' || id === 'tailwindcss/utilities.css' || id === './utilities.css') {
      return {
        base,
        content: utilities,
      };
    }

    throw new Error(`The browser build does not support @import for "${id}"`);
  }

  try {
    let sheet = load();

    return sheet;
  } catch (err) {
    throw err;
  }
}

async function loadModule(): Promise<never> {
  throw new Error(`The browser build does not support plugins or config files.`);
}

async function tailwindBundle(string: string, { prefix }: { prefix: string }) {
  const compiler = await createCompiler();
  const newClasses = new Set<string>(string.split(/[^a-zA-Z0-9_-]+/));
  const css = compiler.build(Array.from(newClasses));

  return await postcss([prefixer({ prefix })]).process(css, { from: undefined });
}

export default tailwindBundle;
