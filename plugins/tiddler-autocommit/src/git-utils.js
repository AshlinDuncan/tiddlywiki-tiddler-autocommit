/*\
title: $:/plugins/ashlin/tiddler-autocommit/git-utils.js
type: application/javascript
module-type: library
\*/

// Includes some library functions for commonly-used SimpleGit bits.

// Parses the body of the request to a JSON object. Rejects on read or json error.
"use strict";

const filterTid = "$:/plugins/ashlin/tiddler-autocommit/Config/TiddlerIgnoreFilter";

// Returns an array of relevant tiddlers
export function getFilteredTiddlers() {
	// Compile a filter for which changes to commit vs. to ignore.
	let filterFn = $tw.wiki.compileFilter($tw.wiki.getTiddlerText(filterTid));

	// filterFn takes an iterator of tiddler titles for which tiddlers to filter.
	// $tw.wiki.each goes through all tiddler titles.
	return filterFn.call($tw.wiki, $tw.wiki.each);
}

// Returns an array of relevant tiddler paths
export function getFilteredTiddlerPaths() {
	let paths = [];
	for (let title of getFilteredTiddlers()) {
		if (!$tw.boot.files[title]) {
			continue;
		}
		// Check to see if it's in the repo
		if (!$tw.boot.files[title].filepath.startsWith($tw.boot.wikiTiddlersPath)) {
			continue;
		}

		paths.push($tw.boot.files[title].filepath);
	}
	return paths;
}
