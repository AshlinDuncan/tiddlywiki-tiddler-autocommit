/*\
title: $:/plugins/ashlin/tiddler-autocommit/git-syncer.js
type: application/javascript
module-type: library

Client-side. Sends requests to the server.

\*/

"use strict";

const pollingInterval = 6 * 1000; // How frequently to check for state changes outside of committing and pushing

// Which tiddlers should be committed
const filterTid = "$:/plugins/ashlin/tiddler-autocommit/Config/TiddlerIgnoreFilter";
const localBranchTid = "$:/plugins/ashlin/tiddler-autocommit/Config/LocalBranch";
const dirtyTid = "$:/plugins/ashlin/tiddler-autocommit/state/Dirty";
const aheadTid = "$:/plugins/ashlin/tiddler-autocommit/state/Ahead";
const commitInProgressTid = "$:/plugins/ashlin/tiddler-autocommit/state/CommitInProgress";
const pushInProgressTid = "$:/plugins/ashlin/tiddler-autocommit/state/PushInProgress";

export class GitSyncer {
	constructor({ baseurl, logging = false }) {
		this.baseurl = baseurl;
		let ext = $tw.browser ? 'browser' : '';
		ext += $tw.node ? 'server' : '';
		this.logging = logging;
		this.logger = new $tw.utils.Logger(`git-syncer`, {
			colour: "cyan",
			enable: this.logging,
		});
		this.branchName = null;
		this.branch = null;
		this._updateConf();
		this.updateState();

		// The time of the last state update due to changes: the default updates triggered by committing and pushing
		// aren't restricted by this.
		this.lastStateUpdate = new Date();
		this.updateScheduled = false;

		// Only note changes that we care about
		this.filterFn = $tw.wiki.compileFilter($tw.wiki.getTiddlerText(filterTid));

		$tw.wiki.addEventListener("change", (changes) => {
			// If we're already planning on running an update, don't need to worry about it.
			if (this.updateScheduled) return;

			// If we need to recompile the filter function
			$tw.utils.each(changes, (change, title) => {
				if (title === filterTid) {
					this.filterFn = $tw.wiki.compileFilter($tw.wiki.getTiddlerText(filterTid));
				}
			});

			// If our only changes are due to the state change, that's dumb.
			let filteredChanges = this.filterFn.call($tw.wiki, (iterator) => {
				$tw.utils.each(changes, (change, title) => {
					let tiddler = $tw.wiki.getTiddler(title);
					iterator(tiddler, title);
				});
			});
			if (filteredChanges.length == 0) return;

			// Span of time since the last update
			let duration = new Date() - this.lastStateUpdate;

			// If the time elapsed since the last update is greater than the polling interval, we're good!
			if (duration >= pollingInterval) {
				this.lastStateUpdate = new Date();
				this.updateState();
			}
			// Otherwise, schedule an event for the future.
			else {
				this.updateScheduled = true;
				setTimeout(() => {
					this.lastStateUpdate = new Date();
					this.updateState();
					this.updateScheduled = false;
				}, pollingInterval - duration);
			}
		});

		setTimeout(pollingInterval);

		this.logger.log("initialized");
	}

	// Takes the repo info from configuration files
	_updateConf() {
		this.branch = $tw.wiki.getTiddlerText(localBranchTid) || null;
	}

	// Returns:
	// {
	// 		dirty: true if has uncommited changes, otherwise false; null on error
	// 		ahead: true if has unpushed commits, otherwise false; null on error
	// }
	async _getState() {
		this.logger.log("Fetching state...");
		this._updateConf();
		let response;
		try {
			response = await fetch(this.baseurl + "ashlin/tiddler-autocommit/git-status", {
				method: "POST",
				body: JSON.stringify({
					branch: this.branch,
				}),
				headers: {
					"X-Requested-With": "TiddlyWiki"
				}
			});
		} catch (e) {
			this.logger.alert("Network error during state fetch!");
			console.error("Network error during state fetch:", e);
			return { dirty: null, ahead: null }
		}

		// Process response
		if (!response.ok) {
			await this._handleHTTPError(response, "state fetch");
			return;
		}

		let body = await response.json();

		let dirty = null;
		let ahead = null;
		if (body.dirty != null) {
			dirty = body.dirty;
		}

		if (body.ahead != null) {
			ahead = body.ahead;
		}

		if (body.error && body.message) {
			this.logger.alert(body.message);
		} else if (body.message) {
			this.logger.log(body.message);
		}

		return { dirty, ahead }
	}

	// Updates the state tiddlers for dirty and ahead
	async updateState() {
		let { dirty, ahead } = await this._getState();

		if (dirty != null) {
			this._updateBoolTiddler(dirtyTid, dirty);
		}

		if (ahead != null) {
			this._updateBoolTiddler(aheadTid, ahead);
		}
	}

	// Commits the current wiki to the repo
	async commit({ message, author, tag }) {
		this._updateConf();

		if (!message) {
			this.logger.alert("Commit message must exist!");
			return;
		}

		this.logger.log("Commiting ", message, author, tag);
		this._updateBoolTiddler(commitInProgressTid, true);
		// Using fetch
		let response;
		try {
			response = await fetch(this.baseurl + "ashlin/tiddler-autocommit/git-commit", {
				method: "POST",
				body: JSON.stringify({
					message,
					author,
					tag,
					branch: this.branch,
				}),
				headers: {
					"X-Requested-With": "TiddlyWiki"
				}
			});
		} catch (e) {
			this.logger.alert("Network error during commit!");
			console.error("Network error during commit:", e);
			return;
		}
		this._updateBoolTiddler(commitInProgressTid, false);

		// Process response
		if (!response.ok) {
			await this._handleHTTPError(response, "commit");
			return
		}

		let body = await response.json();

		if (body.error && body.message) {
			this.logger.alert(body.message);
		} else if (body.message) {
			this.logger.log(body.message);
		}

		await this.updateState();
	}

	// Pushes the commits to the repo
	async push() {
		this._updateConf();
		this.logger.log(`Pushing. Branch: ${this.branch}`);
		this._updateBoolTiddler(pushInProgressTid, true);
		// Using fetch
		let response;
		try {
			response = await fetch(this.baseurl + "ashlin/tiddler-autocommit/git-push", {
				method: "POST",
				body: JSON.stringify({
					branch: this.branch
				}),
				headers: {
					"X-Requested-With": "TiddlyWiki"
				}
			});
		} catch (e) {
			this.logger.alert("Network error during push");
			console.error("Network error during push:", e);
			return;
		}

		this._updateBoolTiddler(pushInProgressTid, false);
		// Process the response
		if (!response.ok) {
			await this._handleHTTPError(response, "push");
			return;
		}

		let body = await response.json();

		if (body.error && body.message) {
			this.logger.alert(body.message);
		} else if (body.message) {
			this.logger.log(body.message);
		}

		await this.updateState();
	}

	_updateBoolTiddler(tiddler, value) {
		$tw.wiki.addTiddler(new $tw.Tiddler({
			title: tiddler,
			text: value ? "true" : "false",
		}));
	}

	// Consumes response body, displays HTTP error.
	async _handleHTTPError(response, action) {
		try {
			let body = await response.json();
			this.logger.alert(`HTTP error during ${action}: ${response.status} ${response.statusText}: ${body.message}`);
			return;
		} catch (e) {
			console.error(e);
			this.logger.alert(`HTTP error during ${action}: ${response.status} ${response.statusText}`);
			return;
		}
	}
}