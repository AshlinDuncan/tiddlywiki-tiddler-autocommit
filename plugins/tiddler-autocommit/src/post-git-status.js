/*\
title: $:/plugins/ashlin/tiddler-autocommit/post-git-status.js
type: application/javascript
module-type: route

POST /ashlin/tiddler-autocommit/git-status

Note: Uses RPC; not RESTful. Request structure:
{
	"branch":
		local branch to checkout
		MUST exist, NUST track an upstream branch
		optional, defaults to "master"
}

Response structure:

{
	"dirty": true if uncommited changes in tiddlers directory exists, false if not
	"ahead": true if ahead of remote, false if not
}

\*/

"use strict";

import SimpleGit from './simple-git-promise-bundle.js';

import { sendJSON, bodyToJSON } from "./http-utils.js";
import { getFilteredTiddlerPaths } from "./git-utils.js";

export const method = "POST";

export const path = /^\/ashlin\/tiddler-autocommit\/git-status\/?$/;

// Handles a request to this URL. State refers to $tw.
export async function handler(request, response, state) {
	// Get body data
	let reqBody;
	try {
		reqBody = bodyToJSON(state.data, response);
	} catch (e) {
		return;
	}

	// Our request body is successfully read!
	let branch = reqBody.branch || "master";

	let path = $tw.boot.wikiTiddlersPath;

	const simpleGit = SimpleGit(path);
	try {
		// Ensure is repo
		{
			let isRepo = await simpleGit.checkIsRepo();
			if (!isRepo) {
				sendJSON(405, { error: true, message: `Git repository does not exist at ${path}.` }, response);
				return;
			}
		}

		// Ensure a local branch exists
		{
			let { branches } = await simpleGit.branchLocal();
			if (!branches.hasOwnProperty(branch)) {
				sendJSON(405, { error: true, message: `Branch ${branch} does not exist.` }, response);
				return;	
			}
		}

		// Check out the local branch
		await simpleGit.checkout(branch);

		// Ensure it tracks a remote branch
		let status = await simpleGit.status();

		if (status.tracking == null) {
			sendJSON(405, { error: true, message: `Branch ${branch} does not track a remote branch, cannot push.`});
			return;
		}

		// If there are any deleted tiddlers, those are automatically dirty.
		let dirty = status.deleted.length > 0;
		let tiddlerPaths = getFilteredTiddlerPaths();

		// Go through each tiddler and look for changes
		for (let path of tiddlerPaths) {
			if (dirty) break;
			for (let file of status.files) {
				let filepath = file.path;
				// Fix quotes
				if (filepath.startsWith('"') && filepath.endsWith('"')) {
					filepath = filepath.substring(1, filepath.length - 1);
				}
				// Check that paths match, and fix backslash vs slashing.
				if (path.replace(/\\/g, '/').endsWith(filepath)) {
					dirty = true;
					break;
				}
			}
		}

		// Now, ahead will tell us the push status
		let ahead = status.ahead > 0;

		sendJSON(200, { dirty, ahead, error: false }, response);
		return;
	} catch (e) {
		sendJSON(500, { error: true, message: `Unhandled git or server error. Check the logs, nerd.` }, response);
		console.error(e);
		return;
	}

}
