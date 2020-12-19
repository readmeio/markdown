const path = require('path');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');

const common = require('./webpack.common');

const browserConfig = merge(common, {
  entry: './index.js',
  externals: {
    '@readme/variable': '@readme/variable',
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
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  optimization: {
    minimize: false,
    minimizer: [new TerserPlugin()],
  },
});

const serverConfig = merge(browserConfig, {
  target: 'node',
  output: {
    filename: '[name].node.js',
  },
});

module.exports = [browserConfig, serverConfig];
