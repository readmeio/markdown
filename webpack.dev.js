/* eslint-disable import/no-extraneous-dependencies
 */
const path = require('path');
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
    contentBase: './example',
    compress: true,
    publicPath: '/',
    hot: true,
    watchContentBase: true,
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
});

module.exports = config;
