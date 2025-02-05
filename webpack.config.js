const ExtractCSS = require('mini-css-extract-plugin');
const { merge } = require('webpack-merge');

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';

const getConfig = ({ target }) => ({
  target,
  entry: './index',
  plugins: [
    new ExtractCSS({
      filename: '[name].css',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            happyPackMode: true,
            transpileOnly: true,
          },
        },
        exclude: /node_modules(?!\/@readme\/shared)/,
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules(?!\/@readme\/shared)/,
        use: {
          loader: 'babel-loader',
          options: {
            caller: { target },
            cacheCompression: !isDev,
            cacheDirectory: true,
          },
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
    ],
  },
  optimization: {
    minimize: false,
  },
  output: {
    library: {
      type: 'commonjs2',
    },
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.ts', '.tsx'],
  },
});

const browserConfig = merge(getConfig({ target: 'web' }), {
  externals: {
    '@readme/variable': '@readme/variable',
    '@tippyjs/react': '@tippyjs/react',
    mermaid: 'mermaid',
    react: {
      amd: 'react',
      commonjs: 'react',
      commonjs2: 'react',
      root: 'React',
      umd: 'react',
    },
    'react-dom': {
      amd: 'react-dom',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      root: 'ReactDOM',
      umd: 'react-dom',
    },
  },
  output: {
    library: {
      type: 'umd',
    },
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer'),
      fs: false,
      path: require.resolve('path-browserify'),
    },
  },
});

const serverConfig = merge(getConfig({ target: 'node' }), {
  output: {
    filename: '[name].node.js',
  },
  externals: {
    react: {
      amd: 'react',
      commonjs: 'react',
      commonjs2: 'react',
      root: 'React',
      umd: 'react',
    },
    'react-dom': {
      amd: 'react-dom',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      root: 'ReactDOM',
      umd: 'react-dom',
    },
    'react-dom/server': {
      amd: 'react-dom/server',
      commonjs2: 'react-dom/server',
      commonjs: 'react-dom/server',
      root: 'ReactDOM/server',
      umd: 'react-dom/server',
    },
  },
  devtool: 'source-map',
});

module.exports = [browserConfig, serverConfig];
