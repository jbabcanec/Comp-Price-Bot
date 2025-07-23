const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Get root directory (go up two levels from configs/webpack/)
const rootDir = path.resolve(__dirname, '../..');

module.exports = {
  entry: path.resolve(rootDir, 'src/renderer/index.tsx'),
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(rootDir, 'tsconfig.renderer.json'),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@renderer': path.resolve(rootDir, 'src/renderer'),
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(rootDir, 'dist/renderer'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(rootDir, 'src/renderer/index.html'),
      filename: 'index.html',
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(rootDir, 'dist/renderer'),
    },
    compress: true,
    port: 3000,
    hot: true,
  },
};