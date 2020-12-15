/* eslint-disable-next-line import/no-extraneous-dependencies
 */
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

const config = merge(shared, {
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
    port: 9966,
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
