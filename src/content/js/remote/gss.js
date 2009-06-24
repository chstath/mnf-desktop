var gss = {
	//The current user's username.
	username : 'aaitest@grnet-hq.admin.grnet.gr',
	//The current user's authentication token.
	authToken : 'vqzCgDS7uX1vdypt1O+LfoMuUNfl3RVEmxJD+1U+dsxdPqGG5YvLjg==',
	// The root URL of the REST API.
	GSS_URL : 'http://pithos.grnet.gr/pithos/rest',

	// The user root namespace.
	root : null,
	// The container for the list items.
	items : [],

	//Creates a HMAC-SHA1 signature of method+time+resource, using the token.
	sign : function(method, time, resource, token) {
		var q = resource.indexOf('?');
		var res = q == -1? resource: resource.substring(0, q);
		var data = method + time + res;
		// Use strict RFC compliance
		b64pad = "=";
		return b64_hmac_sha1(atob(token), data);
	},

	// A helper function for making API requests.
	sendRequest : function(handler, next, method, resource, modified, file, form, update) {
//	    var loading = document.getElementById('activityIndicator').object;
//	    loading.startAnimation();
	    // If the resource is an absolute URI, remove the GSS_URL.
	    if (resource.indexOf(gss.GSS_URL) == 0)
	        resource = resource.slice(gss.GSS_URL.length, resource.length);
	    resource = resource;
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
//	            loading.stopAnimation();
	            if(req.status == 200) {
	                handler(req, next);
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
	fetchUser : function(next) {
	    gss.sendRequest(gss.parseUser, next, 'GET', '/'+gss.username+'/');
	},

	// Parses the 'user' namespace response.
	parseUser : function(req, next) {
	    gss.root = JSON.parse(req.responseText);
	    gss.items = [];
	    gss.items.push({name: 'Files', location: gss.root['fileroot']});
	    gss.items.push({name: 'Trash', location: gss.root['trash']});
	    gss.items.push({name: 'Shared', location: gss.root['shared']});
	    gss.items.push({name: 'Others', location: gss.root['others']});
	    gss.items.push({name: 'Groups', location: gss.root['groups']});
	    appendLog(JSON.stringify(gss.root), 'blue', 'info');
//	    var list = document.getElementById('list').object;
//	    list.reloadData();
//	    var name = document.getElementById('name');
//	    name.innerHTML = root['name'];
	    next();
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
	    items = [];
	    var folders = filesobj['folders'];
	    while (folders.length > 0) {
	        var folder = folders.pop();
	        items.push({name: folder['name']+'/', location: folder['uri']});
		    appendLog(folder['name'], 'blue', 'info');
	    }
	    var files = filesobj['files'];
	    while (files.length > 0) {
	        var file = files.pop();
	        items.push({name: file['name'], location: file['uri'], owner: file['owner'], data: file});
		    appendLog(file['name'], 'red', 'info');
	    }
//	    var list = document.getElementById('list').object;
//	    list.reloadData();
//	    var browser = document.getElementById('browser').object;
//	    browser.goForward(document.getElementById('listLevel'), 'Files');
	},
	
	// Fetches the 'trash' namespace.
	fetchTrash : function(event) {
	    sendRequest(parseTrash, 'GET', root['trash']);
	},
	
	// Parses the 'trash' namespace response.
	parseTrash : function(req) {
	    var filesobj = JSON.parse(req.responseText);
	    items = [];
	    var folders = filesobj['folders'];
	    while (folders.length > 0) {
	        var folder = folders.pop();
	        items.push({name: folder['name'], location: folder['uri']});
	    }
	    var files = filesobj['files'];
	    while (files.length > 0) {
	        var file = files.pop();
	        items.push({name: file['name'], location: file['uri'], data: file});
	    }
	    var list = document.getElementById('list').object;
	    list.reloadData();
	    var browser = document.getElementById('browser').object;
	    browser.goForward(document.getElementById('listLevel'), 'Trash');
	}
};