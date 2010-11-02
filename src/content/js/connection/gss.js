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
// The URL for search requests.
gss.SEARCH_URL = gss.API_URL + '/search/';
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

// The trash cache.
gss.trash = {};
// The My Shared cache.
gss.shared = {};
// The Others' Shared cache.
gss.others = {};

// Creates a HMAC-SHA1 signature of method+time+resource, using the token.
gss.sign = function (method, time, resource, token) {
	// If the resource is an absolute URI, remove the API_URL.
	if (resource.indexOf(gss.API_URL) === 0)
		resource = resource.slice(gss.API_URL.length, resource.length);
	var q = resource.indexOf('?');
	var res = q == -1? resource: resource.substring(0, q);
	var data = method + time + res;
	// Use strict RFC compliance
	b64pad = "=";
	return b64_hmac_sha1(atob(token), data);
};

gss.getAuth = function(method, resource) {
    var now = (new Date()).toUTCString();
    var authorization = gss.username + " " + gss.sign(method, now, resource, gss.authToken);
    return { authorization: authorization, date: now, authString: "Authorization=" +
            encodeURIComponent(authorization) + "&Date=" + encodeURIComponent(now) };
};

// A helper function for making API requests. It expects a single argument object
// containing the following attributes:
// handler, handlerArg, nextAction, nextActionArg, method, resource, modified,
// file, form, update, loadStartEventHandler, progressEventHandler,
// loadEventHandler, errorEventHandler, abortEventHandler
// It returns the XMLHTTPRequest object created.
gss.sendRequest = function(arg) {
	// Unfortunately single quotes are not escaped by default.
    var resource = arg.resource.replace(/'/g, "%27");
	var now = (new Date()).toUTCString();

	var sig = gss.sign(arg.method, now, resource, gss.authToken);
	var params = null;
	if (arg.form)
		params = arg.form;
	else if (arg.update)
		params = JSON.stringify(arg.update);

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
	// If the resource is not an absolute URI, prepend the API_URL.
	if (resource.indexOf(gss.API_URL) !== 0)
		resource = gss.API_URL + resource;
	req.open(arg.method, resource, true);
	req.onreadystatechange = function (event) {
		if (req.readyState == 4) {
		    hideWorking();
	        var message = "The server responded with an error: HTTP status " + req.status;
			switch (req.status) {
				case 200: // fallthrough
				case 201: // fallthrough
				case 204:
					if (arg.handler)
						arg.handler(req, arg.handlerArg, arg.nextAction, arg.nextActionArg);
					break;
				case 403:
    				appendLog("<b>HTTP response 403:</b> " + arg.method + " " +
    				        resource + "<br/>user: " + gss.username +
    				        "<br/>timestamp: " + now);
				    if (confirm("Your session has expired. You have to reauthenticate."))
    				    doDesktopLogin();
				    break;
				case 0:
    				appendLog(message);
				    break;
				default:
				    try {
					    alert(message + " (" + req.statusText + ")");
					    if (arg.handler)
					        arg.handler(req, arg.handlerArg, arg.nextAction, req.status);
				    } catch (e) {
				        // Handle exceptions when the statusText is unavailable.
				        if (e instanceof Error)
				            message += ". " + e.name + ": " + e.message;
       					alert(message);
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
		var stream = Cc["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Ci.nsIFileInputStream);
		stream.init(arg.file, 0x01, 0444, Ci.nsIFileInputStream.CLOSE_ON_EOF);
		// Try to determine the MIME type of the file
		var mimeType = "application/octet-stream";
		try {
		    var mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
		    mimeType = mimeService.getTypeFromFile(arg.file);
		} catch (e) { /* eat it; just use application/octet-stream */ }
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
	showWorking();
	return req;
};

// Fetches the 'user' namespace.
gss.fetchUser = function (nextAction, nextActionArg) {
	gss.sendRequest({handler: gss.parseUser,
					nextAction: nextAction,
					nextActionArg: nextActionArg,
					method: 'GET',
					resource: '/'+gss.username+'/'});
};

// Parses the 'user' namespace response.
gss.parseUser = function (req, arg, nextAction, nextActionArg) {
	gss.root = JSON.parse(req.responseText);
	gss.rootFolder.uri = gss.root.fileroot;
	if (nextAction)
		nextAction(nextActionArg);
};

// Parses the 'files' namespace response.
gss.parseFiles = function (req, folder, nextAction, nextActionArg) {
    // Just execute the callback for an empty trash (No Content status).
    if (req.status == 204) {
	    if (nextAction)
		    nextAction(nextActionArg);
        return;
    }

    try {
    	var filesobj = JSON.parse(req.responseText);
    } catch (e) {
        var f = folder;
        if (folder && folder.uri)
            f = folder.uri;
        error(e + '\nFolder: [' + f + ']\nInput: [' + req.responseText + ']');
        return;
    }
	gss.updateCache(folder, filesobj);
	var folders = folder.folders;
	for (var i=0; i<folders.length; i++) {
		var f = folders[i];
		f.position = i;
		f.isFolder = true;
		// Calculate the indentation level by counting the slashes.
		var prefix;
		if (f.uri.indexOf(gss.rootFolder.uri) === 0)
		    prefix = gss.rootFolder.uri;
    	else
    	    // Files shared by others have a different URI prefix.
    	    prefix = gss.API_URL + '/' + gss.username;
   		f.level = f.uri.substr(prefix.length).match(/\x2f/g).length - 1;
	}
    // Store the reference to the parent folder to avoid unnecessary future requests.
    folder.files && folder.files.forEach(function (f) {
        // XXX: if (folder.uri !=== gss.trash.uri)
        f.folder = folder;
    });
	folder.isWritable = gss.isWritable;
	if (nextAction)
		nextAction(nextActionArg);
};

// Update the cached resource copy with the new one, in order to maintain cached
// object identities.
gss.updateCache = function(res, newRes) {
    var attr, i, j;/*, cons = Components.classes["@mozilla.org/consoleservice;1"].
            getService(Components.interfaces.nsIConsoleService);
    cons.logStringMessage("updating "+newRes.name);*/
    for (attr in newRes)
        if (newRes.hasOwnProperty(attr)) {
            if (attr === 'folders' || attr === 'files') {
                //cons.logStringMessage(res.name + " " + attr+": "+(res[attr]? res[attr].length: -1));
                if (!res[attr] || res[attr].length === 0)
                    res[attr] = newRes[attr];
                else {
                    // Remove deleted children from cache.
                    for (i=0; i<res[attr].length; i++) {
                        var found = false;
                        for (j=0; j<newRes[attr].length; j++) {
                            if (newRes[attr][j].uri === res[attr][i].uri) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            //cons.logStringMessage("Deleting "+res[attr][i].name);
                            res[attr].splice(i,1);
                        }
                    }
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
                            //cons.logStringMessage("Recursing in "+e.name);
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
                            //cons.logStringMessage("Adding "+e.name);
                            res[attr].push(e);
                        }
                    });
                }
            } else
                res[attr] = newRes[attr];
    }
};

// Fetches the contents of the folder with the specified uri.
gss.fetchFolder = function(folder, nextAction, nextActionArg, uri) {
    gss.sendRequest({handler: gss.parseFiles,
                    handlerArg: folder,
                    nextAction: nextAction,
                    nextActionArg: nextActionArg,
                    method:'GET',
                    resource: uri || folder.uri});
};

// Fetches the contents of the root folder. This call is safe to be performed as the
// first API call, since it fetches the user namespace first if not found.
gss.fetchRootFolder = function(nextAction) {
    if (gss.root.fileroot) {
        gss.fetchFolder(gss.rootFolder, nextAction, gss.rootFolder, gss.root.fileroot);
    } else {
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

// Uploads the specified local file to the provided remote folder URI.
gss.uploadFile = function(file, remoteFolder, loadStartHandler, progressHandler, loadHandler, errorHandler, abortHandler) {
    // Make sure the folder URI ends with a slash.
    var folderUri = remoteFolder.slice(-1) === '/' ? remoteFolder : remoteFolder + '/';
    return gss.sendRequest({
            method: 'PUT',
            resource: folderUri + encodeURI(file.leafName.replace(/ /g, "+")),
            file: file,
            loadStartEventHandler: loadStartHandler,
            progressEventHandler: progressHandler,
            loadEventHandler: loadHandler,
            errorEventHandler: errorHandler,
            abortEventHandler: abortHandler
    });
};

gss.createFolder = function(parent, name, nextAction) {
	var resource = parent.uri + "?new=" + encodeURIComponent(name);
	gss.sendRequest({handler: gss.parseNewFolder,
					handlerArg: {name: name, parent: parent},
					nextAction: nextAction,
					method: 'POST',
					resource: resource});
};

gss.parseNewFolder = function(req, newf, nextAction, error) {
    if (error && nextAction) {
        nextAction();
        return;
    }

    var newFolder = {
        name: newf.name,
        isFolder: true,
        uri: req.responseText.trim(),
        level: newf.parent.level ? newf.parent.level + 1 : 1
    };
    newf.parent.folders.push(newFolder);
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
					resource: file.uri+"?"+Math.random()});
};

// Parses the response for a file request.
gss.parseFile = function (req, file, nextAction, nextActionArg) {
    var headers = gss.parseHeaders(req);
    var fileobj = JSON.parse(headers['X-GSS-Metadata']);
    //The name is encoded in the X-GSS-Metadata header
    fileobj.name = fileobj.name.replace('+', ' ');
    fileobj.name = decodeURIComponent(fileobj.name);
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

// A helper function that checks whether the user has logged-in to the service.
gss.hasAuthenticated = function () {
    return gss.username && gss.authToken;
};

// Update the specified resource (file or folder) properties, using the new
// values in the changes parameter.
gss.update = function (resource, changes, nextAction) {
    var newProperties = {};
    if (changes.name)
        newProperties.name = changes.name;
    if (changes.permissions)
        newProperties.permissions = changes.permissions;
    if (changes.tags)
        newProperties.tags = changes.tags;
    if (changes.readForAll !== undefined)
        newProperties.readForAll = changes.readForAll;
    if (changes.versioned !== undefined)
        newProperties.versioned = changes.versioned;
    if (changes.modificationDate)
        newProperties.modificationDate = changes.modificationDate;
    gss.sendRequest({
        handler: nextAction,
        update: newProperties,
        method: 'POST',
        resource: resource.uri + "?update="
    });
};

// Makes a search request for the provided query string and then executes
// the specified nextAction with the results as the argument.
gss.search = function (query, nextAction) {
    gss.sendRequest({
        handler: function(req, arg, nextAction) {
            if (nextAction)
                nextAction(JSON.parse(req.responseText));
        },
        nextAction: nextAction,
        method:'GET',
        resource: gss.SEARCH_URL + encodeURIComponent(query)
    });
};

// Return the groups defined by this user.
gss.getUserGroups = function (nextAction, nextActionArg) {
    gss.sendRequest({
        handler: gss.parseGroups,
        nextAction: nextAction,
        nextActionArg: nextActionArg,
        method:'GET',
        resource: gss.API_URL + "/" + gss.username + "/groups"
    });
};

// Parses the 'groups' namespace response.
gss.parseGroups = function (req, arg, nextAction, nextActionArg) {
	var groups = JSON.parse(req.responseText);
	// Properly decode the group name.
	groups.forEach(function (g) {
	    try {
    	    g.name = decodeURIComponent(g.name.replace(/\+/g, "%20"));
	    } catch (e) { /* do nothing */ }
	});
	if (nextAction)
		nextAction(groups, nextActionArg);
};

gss.searchForUsers = function (userName, nextAction){
    gss.sendRequest({
        handler: function(req, arg, nextAction) {
            if (nextAction){
                nextAction(JSON.parse(req.responseText));
            }
        },
        nextAction: nextAction,
        method:'GET',
        resource: gss.API_URL + "/users/" + userName
    });
};

// Return the tags defined by this user.
gss.getUserTags = function (nextAction, nextActionArg) {
    gss.sendRequest({
        handler: gss.parseTags,
        nextAction: nextAction,
        nextActionArg: nextActionArg,
        method:'GET',
        resource: gss.API_URL + "/" + gss.username + "/tags"
    });
};


// Parses the 'tags' namespace response.
gss.parseTags = function (req, arg, nextAction, nextActionArg) {
	var tags = JSON.parse(req.responseText);
	if (nextAction)
		nextAction(tags, nextActionArg);
};

gss.fetchTrash = function (nextAction) {
	if (gss.root.trash) {
	    gss.trash.uri = gss.root.trash;
	    // Every item in the trash will have a deleted=true attribute, so
	    // store it in the trash root as well, for simpler detection of the
	    // relevant tree nodes that require a different context menu.
	    gss.trash.deleted = true;
		gss.sendRequest({handler: gss.parseFiles,
						handlerArg: gss.trash,
						nextAction: nextAction,
						nextActionArg: gss.trash,
						method: 'GET',
						resource: gss.root.trash});
	}
	else {
		gss.fetchUser(gss.fetchTrash, nextAction);
	}
};

gss.fetchShared = function (nextAction) {
	if (gss.root.shared) {
	    gss.shared.uri = gss.root.shared;
		gss.sendRequest({handler: gss.parseFiles,
						handlerArg: gss.shared,
						nextAction: nextAction,
						nextActionArg: gss.shared,
						method: 'GET',
						resource: gss.root.shared});
	}
	else {
		gss.fetchUser(gss.fetchShared, nextAction);
	}
};

gss.moveToTrash = function (uri, nextAction) {
	gss.sendRequest({handler: nextAction,
					method: 'POST',
					resource: uri+"?trash="});
};

gss.restoreFromTrash = function (uri, nextAction) {
	gss.sendRequest({handler: nextAction,
					method: 'POST',
					resource: uri+"?restore="});
};

// Retrieves the users that have shared files with the current user.
gss.fetchOthers = function (nextAction) {
	if (gss.root.others) {
	    gss.others.uri = gss.root.others;
		gss.sendRequest({handler: gss.parseOthers,
						handlerArg: gss.others,
						nextAction: nextAction,
						nextActionArg: gss.others,
						method: 'GET',
						resource: gss.root.others});
	}
	else {
		gss.fetchUser(gss.fetchOthers, nextAction);
	}
};

// Parses the 'others' namespace response.
gss.parseOthers = function (req, others, nextAction) {
	var users = JSON.parse(req.responseText);
	// Decorate the users as pseudo-folders for uniform handling.
	for (var i=0; i< users.length; i++) {
	    var u = users[i];
	    u.name = u.username;
	    u.isFolder = true;
	    u.level = 1;
	    u.position = i;
	}
	others.folders = users;
	others.files = [];
	//gss.updateCache(others, users);
	if (nextAction)
		nextAction(others);
};
