const path = require('path');

const PLUGIN_NAME = 'GemojiCatalogGuardPlugin';
const GEMOJI_PATH = `${path.sep}node_modules${path.sep}gemoji${path.sep}`;

/**
 * Webpack plugin that fails the build when the `main` entry uses gemoji's full catalog, which belongs in
 * owlmoji-details. Left unused, webpack marks it as dead code that consumer minifiers drop.
 *
 * @param {import('webpack').Compiler} compiler
 */
function gemojiCatalogGuardPlugin(compiler) {
  compiler.hooks.thisCompilation.tap(PLUGIN_NAME, compilation => {
    compilation.hooks.afterOptimizeChunks.tap(PLUGIN_NAME, () => {
      // Without export-usage tracking (e.g. development builds) there is nothing to check.
      if (!compilation.options.optimization.usedExports) return;

      const main = compilation.entrypoints.get('main');
      const gemoji = [...compilation.modules].find(mod => mod.nameForCondition()?.includes(GEMOJI_PATH));
      if (!main || !gemoji) {
        compilation.warnings.push(new compiler.webpack.WebpackError(`${PLUGIN_NAME}: no main entry or gemoji module`));
        return;
      }

      const runtime = main.getEntrypointChunk().runtime;
      if (compilation.moduleGraph.getExportsInfo(gemoji).getUsedName('gemoji', runtime) === false) return;

      compilation.errors.push(
        new compiler.webpack.WebpackError(
          "The main entry uses gemoji's full catalog; import it in lib/owlmoji-details instead.",
        ),
      );
    });
  });
}

module.exports = gemojiCatalogGuardPlugin;
