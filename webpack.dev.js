/* eslint-disable import/no-extraneous-dependencies
 */
const path = require('path');

const webpack = require('webpack');
const { merge } = require('webpack-merge');

const common = require('./webpack.common');

const config = merge(common, {
  entry: {
    demo: './example/index.jsx',
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
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
    fallback: { path: require.resolve('path-browserify') },
  },
});

module.exports = config;
