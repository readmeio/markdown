/* eslint-disable import/no-extraneous-dependencies
 */
const path = require('path');

const webpack = require('webpack');
const { merge } = require('webpack-merge');

const common = require('./webpack.common');

console.log('USE_LEGACY', process.env.USE_LEGACY);

const config = merge(common, {
  entry: {
    demo: process.env.USE_LEGACY ? './example/index.legacy.jsx' : './example/index.jsx',
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
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  resolve: {
    fallback: { path: require.resolve('path-browserify') },
  },
});

module.exports = config;
