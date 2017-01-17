module.exports = {
  devtool: 'source-map',
  entry: {
    'content_script': './src/content_script.js'
  },
  output: {
    path:  __dirname + '/dist',
    filename: '[name].js',
    sourceMapFilename: '[name].js.map'
  }
};
