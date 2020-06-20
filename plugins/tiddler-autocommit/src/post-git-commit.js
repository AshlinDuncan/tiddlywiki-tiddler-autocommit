/*\
title: $:/plugins/ashlin/tiddler-autocommit/post-git-commit.js
type: application/javascript
module-type: route

POST /ashlin/tiddler-autocommit/git-commit

Note: Uses RPC; not RESTful. JSON request structure:
{
	"message":
		message to include with commit
		required
	"author":
		author to include with commit
		<> will be appended if no <email> exists after the name
		optional, defaults to "Anonymous Tiddlywikier <>"
	"tag":
		tag to include with commit
		optional, defaults to no tag
	"branch":
		local branch to checkout and commit to
		MUST exist
		optional, defaults to "master"
}

\*/

"use strict";

import { sendJSON, bodyToJSON } from "./http-utils.js";
import { getFilteredTiddlerPaths } from "./git-utils.js";

import SimpleGit from './simple-git-promise-bundle.js';

export const method = "POST";

export const path = /^\/ashlin\/tiddler-autocommit\/git-commit\/?$/;

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
	let message = reqBody.message;
	let author = reqBody.author || "Anonymous TiddlyWikier <>";
	let tag = reqBody.tag;
	let branch = reqBody.branch || "master";

	let path = $tw.boot.wikiTiddlersPath;

	if (!message) {
		sendJSON(400, { error: true, message: `Commit message must exist.` }, response);
		return;
	}

	// Ensure the author is the correct format
	if (!(/.*\s<>/.test(author))) {
		if (/.*[^\s]$/) {
			author += " ";
		}
		author += "<>";
	}

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

		// Unstage any already-staged commits
		await simpleGit.reset("mixed");

		// Add the tiddlers
		for (let path of getFilteredTiddlerPaths()) {
			await simpleGit.add(path);
		}

		// Add any deletions
		let status = await simpleGit.status();
		for (let deletion of status.deleted) {
			// Remove quotes
			if (deletion.startsWith('"') && deletion.endsWith('"')) {
				deletion = deletion.substring(1, deletion.length - 1);
			}
			// :/ refers to the root of the repository
			await simpleGit.add(`:/${deletion}`);
		}

		// Aaand commit them.
		await simpleGit.commit(message, {
			'--author': author
		});

		// Lastly, tag!
		if (tag) {
			let tags = await simpleGit.tags();
			for (let oldTag of tags.all) {
				if (oldTag === tag) {
					sendJSON(200, { error: true, message: `Commit successful, but tag ${tag} already exists.` }, response);
					return;
				}
			}

			await simpleGit.addTag(tag);
		}

		sendJSON(200, { error: false, message: `Committed successfully` }, response);
		return;
	} catch (e) {
		sendJSON(500, { error: true, message: `Unhandled git or server error. Check the logs, nerd.` }, response);
		console.error(e);
		return;
	}
}
