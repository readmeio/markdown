const ExtractCSS = require('mini-css-extract-plugin');

module.exports = {
  plugins: [
    new ExtractCSS({
      filename: '[name].css',
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
        loaders: [ExtractCSS.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        loaders: [ExtractCSS.loader, 'css-loader', 'sass-loader'],
      },
      {
        // eslint-disable-next-line unicorn/no-unsafe-regex
        test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        loader: 'file-loader?name=dist/fonts/[hash].[ext]',
        exclude: /(node_modules)/,
      },
      {
        test: /\.(txt|md)$/i,
        use: 'raw-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx'],
  },
};
