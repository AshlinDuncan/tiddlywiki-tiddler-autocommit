/*\
title: $:/plugins/ashlin/tiddler-autocommit/action-git-commit.js
type: application/javascript
module-type: widget
\*/

"use strict";
import { widget as Widget } from "$:/core/modules/widgets/widget.js";

class GitCommitWidget extends Widget {
	constructor(parseTreeNode, options) {
		super(parseTreeNode, options);
	}

	render(parent, nextSibling) {
		this.computeAttributes();
		this.execute();
	}

	// Compute state
	execute() {
		this.commitMessage = this.getAttribute("message", "");
		this.commitAuthor = this.getAttribute("author", "");
		this.commitTag = this.getAttribute("tag", "");
	}

	// Recompute state if necessary to re-render
	refresh(changedTiddlers) {
		let changedAttributes = this.computeAttributes();
		if (changedAttributes["message"] || changedAttributes["author"] || changedAttributes["tag"]) {
			this.refreshSelf();
			return true;
		}
		return this.refreshChildren(changedTiddlers);
	}

	// Let's go!
	invokeAction(triggeringWidget, event) {
		console.log("Commit!", this.commitMessage, this.commitAuthor, this.commitTag);
		if ($tw.ashlinGitSyncer) {
			console.log("yep!");
			$tw.ashlinGitSyncer.commit({
				message: this.commitMessage,
				author: this.commitAuthor,
				tag: this.commitTag,
			});
			return true;
		} else {
			console.log("nope :(");
			return false;
		}
	}
}
module.exports["action-git-commit"] = GitCommitWidget;
