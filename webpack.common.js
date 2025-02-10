/* eslint-disable import/no-extraneous-dependencies
 */
const ExtractCSS = require('mini-css-extract-plugin');
const sass = require('sass');
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
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
        },
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules\/(?!@readme\/[\w-]+\/)/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.m?js$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      },
      { test: /tailwindcss\/.*\.css$/, type: 'asset/source' },
      {
        test: /\.css$/,
        exclude: /tailwindcss\/.*\.css$/,
        use: [ExtractCSS.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          ExtractCSS.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: sass,
            },
          },
        ],
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'dist/fonts/[hash].[ext]',
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.ts', '.tsx', '.md', '.css'],
    fallback: { buffer: require.resolve('buffer'), util: require.resolve('util/') },
  },
};
