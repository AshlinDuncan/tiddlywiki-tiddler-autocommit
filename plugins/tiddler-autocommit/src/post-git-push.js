/*\
title: $:/plugins/ashlin/tiddler-autocommit/post-git-push.js
type: application/javascript
module-type: route

POST /ashlin/tiddler-autocommit/git-push

Note: Uses RPC; not RESTful. Request structure:
{
	"branch":
		local branch to checkout and push to remote
		MUST exist, NUST track an upstream branch
		optional, defaults to "master"
}

\*/

"use strict";

import SimpleGit from './simple-git-promise-bundle.js';
import { sendJSON, bodyToJSON } from "./http-utils.js";

export const method = "POST";

export const path = /^\/ashlin\/tiddler-autocommit\/git-push\/?$/;

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

		await simpleGit.push();
		await simpleGit.pushTags();

		sendJSON(200, { error: false, message: `Pushed successfully` }, response);
		return;
	} catch (e) {
		sendJSON(500, { error: true, message: `Unhandled git or server error. Check the logs, nerd.` }, response);
		console.error(e);
		return;
	}

}
