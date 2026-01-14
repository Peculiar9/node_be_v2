const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production', // Enables minification by default
  entry: './src/index.ts', // Adjust this to your main file
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'), // Adjust the output directory
  },
  resolve: {
    extensions: ['.ts', '.js'], // Support both TypeScript and JavaScript files
    alias: {
      '@extensions': path.resolve(__dirname, 'src/extensions'),
      '@Core': path.resolve(__dirname, 'src/Core'),
      '@Infrastructure': path.resolve(__dirname, 'src/Infrastructure'),
      '@Presentation': path.resolve(__dirname, 'src/Presentation'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // Apply this rule to TypeScript files
        use: 'ts-loader', // Use ts-loader to transpile TypeScript
        exclude: /node_modules/, // Exclude node_modules from processing
      },
    ],
  },
  optimization: {
    minimize: true, // Minification
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false, // Mangling property names
          keep_classnames: false,
          keep_fnames: false,
          sourceMap: false,
        },
      }),
    ],
    usedExports: true, // Tree-shaking
  },
  target: 'node', // Specify the target environment (e.g., Node.js)
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp:
        /^bson-ext|kerberos|@mongodb-js\/zstd|snappy|aws4|mongodb-client-encryption$/,
    }),
  ],
};
