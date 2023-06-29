/* eslint-disable import/no-extraneous-dependencies
 */
const ExtractCSS = require('mini-css-extract-plugin');
const webpack = require('webpack');

module.exports = {
  plugins: [
    new ExtractCSS({
      filename: '[name].css',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  module: {
    rules: [
      {
        test: /node_modules\/.*(is-plain-obj|parse5)\/.*.js$/,
        use: {
          loader: 'babel-loader',
          options: { extends: './.babelrc' },
        },
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules\/(?!@readme\/[\w-]+\/)/,
        use: {
          loader: 'babel-loader',
          options: { extends: './.babelrc' },
        },
      },
      {
        test: /\.css$/,
        use: [ExtractCSS.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [ExtractCSS.loader, 'css-loader', 'sass-loader'],
      },
      {
        // eslint-disable-next-line unicorn/no-unsafe-regex
        test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'dist/fons/[hash].[ext]',
          },
        },
      },
      {
        test: /\.(txt|md)$/i,
        type: 'asset/source',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx'],
    fallback: {
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer'),
    },
  },
};
