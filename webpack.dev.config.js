const path = require('path');
const { merge } = require('webpack-merge');
const { shared } = require('./webpack.config');

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
  devtool: 'inline-source-maps',
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
});

module.exports = config;
