const path = require('path');

// Unfortunately, TiddlyWiki doesn't play well with node libraries. To use simple-git or other libraries,
// we need to pack it up into a module. This module is specified here and exported to the plugin directory.

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