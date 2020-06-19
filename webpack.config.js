const path = require('path');

module.exports = [{
    entry: './node_modules/simple-git/promise.js',
    target: 'node',
    output: {
        path: path.resolve(__dirname, './plugins/tiddler-autocommit/lib'),
        filename: 'simple-git-promise-bundle.js',
        libraryTarget: 'commonjs2',
        library: 'SimpleGit'
    },
    module: {
    }
}];