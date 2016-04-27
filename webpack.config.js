var path = require('path');

module.exports = {
  entry: {
    app: [path.resolve('./app/js/main.js')]
  },
  output: {
    path: path.resolve('/'),
    filename: "./bundle.js"
  },
  module: {
    loaders: [
      {
        loader: 'babel-loader',
        include: [
          path.resolve(__dirname, "app/js")
        ],
        test: /\.js$/,
        query: {
          presets: 'es2015'
        }
      }
    ]
  },
  devServer: {
    contentBase: "./app"
  },
  devtool: 'source-map'
};
