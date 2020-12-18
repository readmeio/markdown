/* eslint-disable import/no-extraneous-dependencies
 */
const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

const port = process.env.PORT || 9966;
const host = process.env.HEROKU ? '0.0.0.0' : 'localhost';

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
    host,
    port,
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
