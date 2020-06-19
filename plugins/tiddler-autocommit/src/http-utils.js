/*\
title: $:/plugins/ashlin/tiddler-autocommit/http-utils.js
type: application/javascript
module-type: library
\*/


// Parses the body of the request to a JSON object. Rejects on read or json error.

export async function sendJSON(status, json, response) {
	response.writeHead(status, {
		"Content-Type": "application/json"
	});
	response.write(JSON.stringify(json));
	response.end();
}


// Parses data into a readable format. Throws on failure and returns a relevant error to response.
export function bodyToJSON(data, response) {
	try {
		return JSON.parse(data);
	} catch (e) {
		// If json error
		if (e.constructor == SyntaxError) {
			sendJSON(400, { message: `Syntax error during JSON parsing: ${e.message}` }, response);
		} else {
			console.error(e);
			sendJSON(500, {}, response);
		}
		throw new Error("Body not parsed.");
	}
}