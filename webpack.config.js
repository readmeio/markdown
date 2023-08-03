const TerserPlugin = require('terser-webpack-plugin');
const { merge } = require('webpack-merge');

const common = require('./webpack.common');

const browserConfig = merge(common, {
  entry: './index.jsx',
  externals: {
    '@readme/variable': '@readme/variable',
    '@tippyjs/react': '@tippyjs/react',
    '@mdx-js/runtime': '@mdx-js/runtime',
    'remark-mdx': 'remark-mdx',
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
      type: 'commonjs2',
    },
  },
  optimization: {
    minimize: false,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    fallback: {
      fs: false,
      util: false,
      assert: false,
      path: require.resolve('path-browserify'),
    },
  },
});

const serverConfig = merge(browserConfig, {
  target: 'node',
  output: {
    filename: '[name].node.js',
  },
});

module.exports = [browserConfig, serverConfig];
