// webpack.config.js
const path = require('path');

module.exports = {
  entry: './lib/index.js',
  output: {
    filename: 'sunbird-file-upload-library.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'SunbirdFileUploadLib',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  mode: 'production',
};
