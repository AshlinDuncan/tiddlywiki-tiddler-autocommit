/*\
title: $:/plugins/ashlin/tiddler-autocommit/action-git-push.js
type: application/javascript
module-type: widget
\*/
"use strict";
import { widget as Widget } from "$:/core/modules/widgets/widget.js";

class GitPushWidget extends Widget {
	constructor(parseTreeNode, options) {
		super(parseTreeNode, options);
	}

	render(parent, nextSibling) {
		this.computeAttributes();
		this.execute();
	}

	// Compute state
	execute() {
		// No state!
	}

	// Recompute state if necessary to re-render
	refresh(changedTiddlers) {
		let changedAttributes = this.computeAttributes();
		// No state! Never need to refresh.
		if (false) {
			this.refreshSelf();
			return true;
		}
		return this.refreshChildren(changedTiddlers);
	}

	// Let's go!
	invokeAction(triggeringWidget, event) {
		if ($tw.ashlinGitSyncer) {
			$tw.ashlinGitSyncer.push();
			return true;
		} else {
			return false;
		}
	}
}

module.exports["action-git-push"] = GitPushWidget;