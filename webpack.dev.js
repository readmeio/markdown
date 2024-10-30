/* eslint-disable import/no-extraneous-dependencies
 */
const path = require('path');

const webpack = require('webpack');
const { merge } = require('webpack-merge');

const common = require('./webpack.common');

const config = merge(common, {
  entry: {
    demo: './example/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'example/'),
    filename: '[name].js',
  },
  devServer: {
    static: './example',
    compress: true,
    port: 9966,
    hot: true,
  },
  devtool: 'eval',
  module: {
    rules: [
      {
        test: /\.(txt|mdx?)$/i,
        type: 'asset/source',
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  resolve: {
    fallback: {
      fs: require.resolve('browserify-fs'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
    },
  },
});

module.exports = config;
