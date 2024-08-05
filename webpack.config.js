const TerserPlugin = require('terser-webpack-plugin');
const { merge } = require('webpack-merge');

const common = require('./webpack.common');

const browserConfig = merge(common, {
  entry: './index.js',
  externals: {
    '@readme/variable': '@readme/variable',
    '@tippyjs/react': '@tippyjs/react',
    react: {
      amd: 'react',
      commonjs: 'react',
      commonjs2: 'react',
      root: 'React',
      umd: 'react',
    },
    'react-dom': {
      amd: 'react-dom',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      root: 'ReactDOM',
      umd: 'react-dom',
    },
  },
  output: {
    library: {
      type: 'umd',
    },
  },
  optimization: {
    minimize: false,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    fallback: { path: require.resolve('path-browserify') },
  },
});

const serverConfig = merge(browserConfig, {
  target: 'node',
  output: {
    filename: '[name].node.js',
  },
});

module.exports = [browserConfig, serverConfig];
