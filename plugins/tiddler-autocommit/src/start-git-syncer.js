/*\
title: $:/plugins/ashlin/tiddler-autocommit/start-git-syncer.js
type: application/javascript
module-type: startup

Startup script to begin communicating with the server routes about git actions.

\*/

"use strict";
import { GitSyncer } from "./git-syncer.js";

export function startup() {
	// Only run on the client-side browser!
	if (!$tw.browser || $tw.node) {
		console.log("is node");
		return;
	}

	// Ensure there's a syncer set up with the server. If not, there's no point.
	if (!$tw.syncer || !$tw.syncer.syncadaptor) return;

	// Add to global namespace so widgets can access. "ashlin" prefix for namespacing.
	$tw.ashlinGitSyncer = new GitSyncer({
		baseurl: $tw.syncer.syncadaptor.host,
		logging: true,
	});
}
