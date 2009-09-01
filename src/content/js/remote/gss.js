/* -*- mode: JavaScript; c-basic-offset: 4; tab-width: 4; indent-tabs-mode: nil -*- */
/* ex: set tabstop=4 expandtab: */
/*
 * Copyright (c) 2009 Panagiotis Astithas
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

var gss;
if (!gss) gss = {};

// The current user's username.
gss.username = '';
// The current user's authentication token.
gss.authToken = '';
// The login nonce.
gss.nonce = '';
// The GSS server hostname.
gss.SERVER = 'pithos.grnet.gr';
// The root URL of the GSS service.
gss.SERVICE_URL = 'http://' + gss.SERVER + '/pithos/';
// The root URL of the REST API.
gss.API_URL = gss.SERVICE_URL + 'rest';
// The URL of the nonce request service.
gss.NONCE_URL = gss.SERVICE_URL + 'nonce';
// The URL of the login service.
gss.LOGIN_URL = 'https://' + gss.SERVER + '/pithos/login';
// The URL of the logout service.
gss.LOGOUT_URL = 'https://' + gss.SERVER + '/Shibboleth.sso/Logout';
// The URL of the token issuer service.
gss.TOKEN_URL = 'https://' + gss.SERVER + '/pithos/token';
// The user root namespace.
gss.root = {};
// The file cache
gss.rootFolder = {};

// Creates a HMAC-SHA1 signature of method+time+resource, using the token.
gss.sign = function (method, time, resource, token) {
	var q = resource.indexOf('?');
	var res = q == -1? resource: resource.substring(0, q);
	var data = method + time + res;
	// Use strict RFC compliance
	b64pad = "=";
	return b64_hmac_sha1(atob(token), data);
};

gss.getAuth = function(method, resource) {
	// If the resource is an absolute URI, remove the API_URL.
	if (resource.indexOf(gss.API_URL) === 0)
		resource = resource.slice(gss.API_URL.length, resource.length);
	var now = (new Date()).toUTCString();
	var sig = gss.sign(method, now, resource, gss.authToken);
	var authorization = gss.username + " " + gss.sign(method, now, resource, gss.authToken);
	var date = now;
	return {authorization: authorization, date: date, authString: "Authorization=" +  encodeURIComponent(authorization) + "&Date=" + encodeURIComponent(date)};
};

// A helper function for making API requests.
gss.sendRequest = function(handler, handlerArg, nextAction, nextActionArg, method, resource, modified, file, form, update, loadStartEventHandler, progressEventHandler, loadEventHandler, errorEventHandler, abortEventHandler) {
	// If the resource is an absolute URI, remove the API_URL.
	if (resource.indexOf(gss.API_URL) === 0)
		resource = resource.slice(gss.API_URL.length, resource.length);
	var now = (new Date()).toUTCString();
	var sig = gss.sign(method, now, resource, gss.authToken);
	var params = null;
	if (form)
		params = form;
	else if (update)
		params = update;

	var req = new XMLHttpRequest();
	if (!file) {
		if (loadStartEventHandler)
			req.addEventListener("loadstart", loadStartEventHandler, false);
		if (progressEventHandler)
			req.addEventListener("progress", progressEventHandler, false);
		if (loadEventHandler)
			req.addEventListener("load", loadEventHandler, false);
		if (errorEventHandler)
			req.addEventListener("error", errorEventHandler, false);
		if (abortEventHandler)
			req.addEventListener("abort", abortEventHandler, false);
	} else {
		if (loadStartEventHandler)
			req.upload.addEventListener("loadstart", loadStartEventHandler, false);
		if (progressEventHandler)
			req.upload.addEventListener("progress", progressEventHandler, false);
		if (loadEventHandler)
			req.upload.addEventListener("load", loadEventHandler, false);
		if (errorEventHandler)
			req.upload.addEventListener("error", errorEventHandler, false);
		if (abortEventHandler)
			req.upload.addEventListener("abort", abortEventHandler, false);
	}
	req.open(method, gss.API_URL + resource, true);
	req.onreadystatechange = function (event) {
		if (req.readyState == 4) {
			if(req.status == 200) {
				handler(req, handlerArg, nextAction, nextActionArg);
			} else if (req.status == 201) {
				if (handler)
					handler(req, handlerArg, nextAction, nextActionArg);
			}
			else {
				alert("Error fetching data: HTTP status " + req.status+" ("+req.statusText+")");
			}
		}
	};
	req.setRequestHeader("Authorization", gss.username + " " + sig);
	req.setRequestHeader("X-GSS-Date", now);
	if (modified)
		req.setRequestHeader("If-Modified-Since", modified);

	if (file) {
		// Make a stream from a file.
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Components.interfaces.nsIFileInputStream);
		stream.init(file, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance

		// Try to determine the MIME type of the file
		var mimeType = "application/octet-stream";
		try {
		  var mimeService = Components.classes["@mozilla.org/mime;1"]
					          .getService(Components.interfaces.nsIMIMEService);
		  mimeType = mimeService.getTypeFromFile(file); // file is an nsIFile instance
		}
		catch(e) { /* eat it; just use application/octet-stream */ }
		req.setRequestHeader("Content-Type", mimeType);
	} else if (form) {
		req.setRequestHeader("Content-Length", params.length);
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;");
	} else if (update) {
		req.setRequestHeader("Content-Length", params.length);
		req.setRequestHeader("Content-Type", "application/json;");
	}

	if (!file)
		req.send(params);
	else
		req.send(stream);
};

gss.fetchUserAsync = function(next) {
	gss.fetchUser(next);
};

// Fetches the 'user' namespace.
gss.fetchUser = function(nextAction, nextActionArg) {
	gss.sendRequest(gss.parseUser, null, nextAction, nextActionArg, 'GET', '/'+gss.username+'/');
};

// Parses the 'user' namespace response.
gss.parseUser = function(req, arg, nextAction, nextActionArg) {
	gss.root = JSON.parse(req.responseText);
	gss.rootFolder.uri = gss.root.fileroot;
	if (nextAction)
		nextAction(nextActionArg);
};

// Parses the 'files' namespace response.
gss.parseFiles = function(req, folder, nextAction, nextActionArg) {
	var filesobj = JSON.parse(req.responseText);
	gss.updateFolderAttributes(folder, filesobj);
	var folders = folder.folders;
	for (var i=0; i<folders.length; i++) {
		var f = folders[i];
		f.level = f.uri.substr(gss.rootFolder.uri.length).match(/\x2f/g).length - 1;
		f.position = i;
		f.isFolder = true;
	}
	if (nextAction)
		nextAction(nextActionArg);
};

// Update the cached folder copy with the new one, in order to maintain cached
// object identities.
gss.updateFolderAttributes = function(folder, newFolder) {
	var attr, cons = Components.classes["@mozilla.org/consoleservice;1"].
   			getService(Components.interfaces.nsIConsoleService);
	cons.logStringMessage("updating "+newFolder.name);
	for (attr in newFolder)
		if (newFolder.hasOwnProperty(attr)) {
			if (attr === 'folders' || attr === 'files') {
				cons.logStringMessage(attr+": "+(folder[attr]? folder[attr].length: -1));
				if (!folder[attr] || folder[attr].length === 0)
					folder[attr] = newFolder[attr];
				else {
					// Remove deleted children from cache.
					jQuery.each(folder[attr], function (i, e) {
						var found = false;
						jQuery.each(newFolder[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = true;
								return false;
							}
						});
						if (!found) {
							cons.logStringMessage("Deleting "+e.name);
							folder[attr].splice(i,1);
						}
					});
					// Recursively update existing children.
					jQuery.each(newFolder[attr], function (i, e) {
						var found;
						jQuery.each(folder[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = el;
								return false;
							}
						});
						if (found) {
							cons.logStringMessage("Recursing in "+e.name);
							gss.updateFolderAttributes(found, e);
						}
					});
					// Add new children to the cache.
					jQuery.each(newFolder[attr], function (i, e) {
						var found = false;
						jQuery.each(folder[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = true;
								return false;
							}
						});
						if (!found) {
							cons.logStringMessage("Adding "+e.name);
							folder[attr].push(e);
						}
					});
				}
			}
			else
				folder[attr] = newFolder[attr];
		}
};

// Fetches the contents of the folder with the specified uri
gss.fetchFolder = function(folder, nextAction, nextActionArg) {
	gss.sendRequest(gss.parseFiles, folder, nextAction, nextActionArg, 'GET', folder.uri);
};

gss.fetchRootFolder = function(nextAction) {
	if (gss.root.fileroot) {
		gss.sendRequest(gss.parseFiles, gss.rootFolder, nextAction, gss.rootFolder, 'GET', gss.root.fileroot);
	}
	else {
		gss.fetchUser(gss.fetchRootFolder, nextAction);
	}
};

gss.getFile = function(file) {
	gss.sendRequest(gss.processFile, null, null, null, "GET", file.uri);
};

gss.processFile = function(req, arg, nextAction, nextActionArg) {
	var contents = req.response;
	if (nextAction)
		nextAction(nextActionArg);
};

gss.uploadFile = function(file, remoteFolder, loadStartEventHandler, progressEventHandler, loadEventHandler, errorEventtHandler, abortEventHandler) {
	var resource = remoteFolder.uri + '/' + encodeURI(file.leafName);
	gss.sendRequest(null, null, null, null, 'PUT', resource, false, file, false, false, loadStartEventHandler, progressEventHandler, loadEventHandler, errorEventtHandler, abortEventHandler);
};
