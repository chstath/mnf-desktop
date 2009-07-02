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

var gss = {
	// The current user's username.
	username: 'aaitest@grnet-hq.admin.grnet.gr',
	// The current user's authentication token.
	authToken: 'vqzCgDS7uX1vdypt1O+LfoMuUNfl3RVEmxJD+1U+dsxdPqGG5YvLjg==',
	// The root URL of the REST API.
	GSS_URL: 'http://pithos.grnet.gr/pithos/rest',
	// The user root namespace.
	root: new Object(),
	// The file cache
	rootFolder: new Object(),

	//Creates a HMAC-SHA1 signature of method+time+resource, using the token.
	sign: function(method, time, resource, token) {
		var q = resource.indexOf('?');
		var res = q == -1? resource: resource.substring(0, q);
		var data = method + time + res;
		// Use strict RFC compliance
		b64pad = "=";
		return b64_hmac_sha1(atob(token), data);
	},

	// A helper function for making API requests.
	sendRequest : function(handler, method, resource, modified, file, form, update) {
	    // If the resource is an absolute URI, remove the GSS_URL.
	    if (resource.indexOf(gss.GSS_URL) == 0)
	        resource = resource.slice(gss.GSS_URL.length, resource.length);
		var now = (new Date()).toUTCString();
	    var sig = gss.sign(method, now, resource, gss.authToken);
		var params = null;
		if (form)
			params = form;
		else if (update)
			params = update;
	
		var req = new XMLHttpRequest();
		req.open(method, gss.GSS_URL + resource, true);
		req.onreadystatechange = function (event) {
			if (req.readyState == 4) {
	            if(req.status == 200) {
	                handler(req);
			    } else {
			    	alert("Error fetching data: HTTP status " + req.status+" ("+req.statusText+")");
			    }
			}
		}
		req.setRequestHeader("Authorization", gss.username + " " + sig);
		req.setRequestHeader("X-GSS-Date", now);
		if (modified)
			req.setRequestHeader("If-Modified-Since", modified);
	
		if (file) {
			req.setRequestHeader("Content-Type", "text/plain");
			req.setRequestHeader("Content-Length", file.length);
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
			req.send(file);
	},

	fetchUserAsync : function(next) {
		gss.fetchUser(next);
	},
	
	//Fetches the 'user' namespace.
	fetchUser : function() {
		gss.parseUser.nextAction = gss.fetchUser.nextAction;
	    gss.sendRequest(gss.parseUser, 'GET', '/'+gss.username+'/');
	},

	// Parses the 'user' namespace response.
	parseUser : function(req) {
	    gss.root = JSON.parse(req.responseText);
	    gss.rootFolder.uri = gss.root.fileroot;
	    if (gss.parseUser.nextAction)
	    	gss.parseUser.nextAction();
	},
	
	// Fetches the 'files' namespace.
	fetchFiles : function() {
	    gss.sendRequest(gss.parseFiles, null, 'GET', gss.root['fileroot']);
	},
	
	fetchFilesAsync : function() {
		gss.fetchUserAsync(gss.fetchFiles);
	},
	
	// Parses the 'files' namespace response.
	parseFiles : function(req) {
	    var filesobj = JSON.parse(req.responseText);
	    var folder = gss.parseFiles.folder;
	    filesobj.uri = folder.uri;
	    if (folder != gss.rootFolder)
	    	folder.parentRef.folders[folder.position] = filesobj;
	    else
	    	gss.rootFolder = filesobj;
	    var folders = filesobj['folders'];
	    for (var i=0; i<folders.length; i++) {
	        var f = folders[i];
	        f.level = f.uri.substr(gss.rootFolder.uri.length).match(/\x2f/g).length - 1;
	        f.position = i;
	        f.parentRef = filesobj;
	        f.isFolder = true;
	    }
	    if (gss.parseFiles.nextAction)
	    	gss.parseFiles.nextAction(filesobj);
	},
	
	//Fetches the contents of the folder with the specified uti
	//uri
	fetchFolder: function(folder) {
		gss.parseFiles.nextAction = gss.fetchFolder.nextAction;
		gss.parseFiles.folder = folder;
		gss.sendRequest(parseFiles, 'GET', folder.uri)
	},
	
	fetchRootFolder: function() {
		if (gss.root.fileroot) {
			gss.parseFiles.folder = gss.rootFolder;
			gss.parseFiles.nextAction = gss.fetchRootFolder.nextAction;
			gss.sendRequest(gss.parseFiles, 'GET', gss.root.fileroot);
		}
		else {
			gss.fetchUser.nextAction = gss.fetchRootFolder;
			gss.fetchUser();
		}
	}
};