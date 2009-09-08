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

// A helper function for making API requests. It expects a single argument object
// containing the following attributes:
// handler, handlerArg, nextAction, nextActionArg, method, resource, modified,
// file, form, update, loadStartEventHandler, progressEventHandler,
// loadEventHandler, errorEventHandler, abortEventHandler
gss.sendRequest = function(arg) {
	// If the resource is an absolute URI, remove the API_URL.
	if (arg.resource.indexOf(gss.API_URL) === 0)
		arg.resource = arg.resource.slice(gss.API_URL.length, arg.resource.length);
	var now = (new Date()).toUTCString();
	var sig = gss.sign(arg.method, now, arg.resource, gss.authToken);
	var params = null;
	if (arg.form)
		params = arg.form;
	else if (arg.update)
		params = arg.update;

	var req = new XMLHttpRequest();
	if (!arg.file) {
		if (arg.loadStartEventHandler)
			req.addEventListener("loadstart", arg.loadStartEventHandler, false);
		if (arg.progressEventHandler)
			req.addEventListener("progress", arg.progressEventHandler, false);
		if (arg.loadEventHandler)
			req.addEventListener("load", arg.loadEventHandler, false);
		if (arg.errorEventHandler)
			req.addEventListener("error", arg.errorEventHandler, false);
		if (arg.abortEventHandler)
			req.addEventListener("abort", arg.abortEventHandler, false);
	} else {
		if (arg.loadStartEventHandler)
			req.upload.addEventListener("loadstart", arg.loadStartEventHandler, false);
		if (arg.progressEventHandler)
			req.upload.addEventListener("progress", arg.progressEventHandler, false);
		if (arg.loadEventHandler)
			req.upload.addEventListener("load", arg.loadEventHandler, false);
		if (arg.errorEventHandler)
			req.upload.addEventListener("error", arg.errorEventHandler, false);
		if (arg.abortEventHandler)
			req.upload.addEventListener("abort", arg.abortEventHandler, false);
	}
	req.open(arg.method, gss.API_URL + arg.resource, true);
	req.onreadystatechange = function (event) {
		if (req.readyState == 4) {
			switch (req.status) {
				case 200: // fallthrough
				case 201: // fallthrough
				case 204:
					if (arg.handler)
						arg.handler(req, arg.handlerArg, arg.nextAction, arg.nextActionArg);
					break;
				default:
				    try {
					    alert("The server responded with an error: HTTP status " +
						      req.status+" ("+req.statusText+")");
				    } catch (Error) {
       					alert("The server responded with an error: HTTP status " +
    						  req.status);
				    }
			}
		}
	};
	req.setRequestHeader("Authorization", gss.username + " " + sig);
	req.setRequestHeader("X-GSS-Date", now);
	if (arg.modified)
		req.setRequestHeader("If-Modified-Since", arg.modified);

	if (arg.file) {
		// Make a stream from a file.
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Components.interfaces.nsIFileInputStream);
		stream.init(arg.file, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance

		// Try to determine the MIME type of the file
		var mimeType = "application/octet-stream";
		try {
		  var mimeService = Components.classes["@mozilla.org/mime;1"]
					          .getService(Components.interfaces.nsIMIMEService);
		  mimeType = mimeService.getTypeFromFile(arg.file); // file is an nsIFile instance
		}
		catch(e) { /* eat it; just use application/octet-stream */ }
		req.setRequestHeader("Content-Type", mimeType);
	} else if (arg.form) {
		req.setRequestHeader("Content-Length", params.length);
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;");
	} else if (arg.update) {
		req.setRequestHeader("Content-Length", params.length);
		req.setRequestHeader("Content-Type", "application/json;");
	}

	if (!arg.file)
		req.send(params);
	else
		req.send(stream);
};

gss.fetchUserAsync = function(next) {
	gss.fetchUser(next);
};

// Fetches the 'user' namespace.
gss.fetchUser = function(nextAction, nextActionArg) {
	gss.sendRequest({handler: gss.parseUser,
					nextAction: nextAction,
					nextActionArg: nextActionArg,
					method: 'GET',
					resource: '/'+gss.username+'/'});
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
	gss.updateCache(folder, filesobj);
	var folders = folder.folders;
	for (var i=0; i<folders.length; i++) {
		var f = folders[i];
		f.level = f.uri.substr(gss.rootFolder.uri.length).match(/\x2f/g).length - 1;
		f.position = i;
		f.isFolder = true;
	}
	folder.isWritable = gss.isWritable;
	if (nextAction)
		nextAction(nextActionArg);
};

// Update the cached resource copy with the new one, in order to maintain cached
// object identities.
gss.updateCache = function(res, newRes) {
	var attr, cons = Components.classes["@mozilla.org/consoleservice;1"].
   			getService(Components.interfaces.nsIConsoleService);
	cons.logStringMessage("updating "+newRes.name);
	for (attr in newRes)
		if (newRes.hasOwnProperty(attr)) {
			if (attr === 'folders' || attr === 'files') {
				cons.logStringMessage(attr+": "+(res[attr]? res[attr].length: -1));
				if (!res[attr] || res[attr].length === 0)
					res[attr] = newRes[attr];
				else {
					// Remove deleted children from cache.
					jQuery.each(res[attr], function (i, e) {
						var found = false;
						jQuery.each(newRes[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = true;
								return false;
							}
						});
						if (!found) {
							cons.logStringMessage("Deleting "+e.name);
							res[attr].splice(i,1);
						}
					});
					// Recursively update existing children.
					jQuery.each(newRes[attr], function (i, e) {
						var found;
						jQuery.each(res[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = el;
								return false;
							}
						});
						if (found) {
							cons.logStringMessage("Recursing in "+e.name);
							gss.updateCache(found, e);
						}
					});
					// Add new children to the cache.
					jQuery.each(newRes[attr], function (i, e) {
						var found = false;
						jQuery.each(res[attr], function (it, el) {
							if (el.uri === e.uri) {
								found = true;
								return false;
							}
						});
						if (!found) {
							cons.logStringMessage("Adding "+e.name);
							res[attr].push(e);
						}
					});
				}
			}
			else
				res[attr] = newRes[attr];
		}
};

// Fetches the contents of the folder with the specified uri
gss.fetchFolder = function(folder, nextAction, nextActionArg) {
	gss.sendRequest({handler: gss.parseFiles,
					handlerArg: folder,
					nextAction: nextAction,
					nextActionArg: nextActionArg,
					method:'GET',
					resource: folder.uri});
};

gss.fetchRootFolder = function(nextAction) {
	if (gss.root.fileroot) {
		gss.sendRequest({handler: gss.parseFiles,
						handlerArg: gss.rootFolder,
						nextAction: nextAction,
						nextActionArg: gss.rootFolder,
						method: 'GET',
						resource: gss.root.fileroot});
	}
	else {
		gss.fetchUser(gss.fetchRootFolder, nextAction);
	}
};

gss.getFile = function(file) {
	gss.sendRequest({handler: gss.processFile,
					method: "GET",
					resource: file.uri});
};

gss.processFile = function(req, arg, nextAction, nextActionArg) {
	var contents = req.response;
	if (nextAction)
		nextAction(nextActionArg);
};

gss.uploadFile = function(file, remoteFolder, loadStartEventHandler, progressEventHandler, loadEventHandler, errorEventHandler, abortEventHandler) {
	var resource = remoteFolder.uri + '/' + encodeURI(file.leafName);
	gss.sendRequest({method: 'PUT',
					resource: resource,
					file: file,
					loadStartEventHandler: loadStartEventHandler,
					progressEventHandler: progressEventHandler,
					loadEventHandler: loadEventHandler,
					errorEventHandler: errorEventHandler,
					abortEventHandler: abortEventHandler});
};

gss.createFolder = function(parent, name, nextAction) {
	var resource = parent.uri + "?new=" + encodeURIComponent(name);
	gss.sendRequest({handler: gss.parseNewFolder,
					handlerArg: parent,
					nextAction: nextAction,
					method: 'POST',
					resource: resource});
};

gss.parseNewFolder = function(req, parent, nextAction) {
	var newFolder = {
		uri: req.responseText.trim(),
		level: parent.level ? parent.level + 1 : 1
	};
	parent.folders.push(newFolder);
	gss.sendRequest({handler: gss.parseFiles,
					handlerArg: newFolder,
					nextAction: nextAction,
					nextActionArg: newFolder,
					method: 'GET',
					resource: newFolder.uri});
};

gss.deleteResource = function(uri, nextAction) {
	gss.sendRequest({handler: nextAction,
					method: 'DELETE',
					resource: uri});
};

// Fetches the specified file.
gss.fetchFile = function (file, nextAction, nextActionArg) {
    gss.sendRequest({handler: gss.parseFile,
                    handlerArg: file,
                    nextAction: nextAction,
                    nextActionArg: nextActionArg,
					method: 'HEAD',
					resource: file.uri});
};
 
// Parses the response for a file request.
gss.parseFile = function (req, file, nextAction, nextActionArg) {
    var headers = gss.parseHeaders(req);
    var fileobj = JSON.parse(headers['X-GSS-Metadata']);
	gss.updateCache(file, fileobj);
    file.isWritable = gss.isWritable;
	if (nextAction)
		nextAction(nextActionArg);
};
 
// A helper function that parses the HTTP headers from the specified XHR and returns them in a map.
gss.parseHeaders = function (req) {
    var allHeaders = req.getAllResponseHeaders();
    var headers = {};
    var ls = /^\s*/;
    var ts = /\s*$/;
    appendLog('Headers: '+allHeaders);
    var lines = allHeaders.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.length == 0) continue;
        var pos = line.indexOf(':');
        var name = line.substring(0, pos).replace(ls, "").replace(ts, "");
        var value = line.substring(pos + 1).replace(ls, "").replace(ts, "");
        headers[name] = value;
    }
    return headers;
};
    
// A helper function that checks whether the current user has write permission
// on the file or folder object the function is attached to.
gss.isWritable = function () {
    if (!this.permissions) return false;
    var hasWrite = false;
    jQuery.each(this.permissions, function (i, e) {
        if (e.user && e.user === gss.username && e.write) {
            hasWrite = true;
            return false;
        }
        // XXX: fix group membership check
        else if (e.group && e.group && e.write) {
            hasWrite = true;
            return false;
        }
	});
	return hasWrite;
};

