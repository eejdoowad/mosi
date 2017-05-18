module.exports = {
  devtool: 'source-map',
  entry: {
    'content_script': './src/content_script.js',
    'background_page': './src/background_page.js'
  },
  output: {
    path:  __dirname + '/dist',
    filename: '[name].js',
    sourceMapFilename: '[name].js.map'
  }
};
