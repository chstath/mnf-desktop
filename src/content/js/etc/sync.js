var sync;
if (!sync) sync = {};

sync.open = function () {
    if (gSyncFolder === "") {
        showPreferences({ tab: 2, next: sync.showSync });
    } else
        sync.showSync();
}

sync.showSync = function () {
    if (!gss.rootFolder.uri)
        alert("You have to login first");
    else
        window.openDialog("chrome://firegss/content/sync.xul", "sync",
            "chrome,modal,dialog,centerscreen");
}

sync.init = function () {
    
}

sync.syncUp = function () {
    var remoteRoot;
    gss.rootFolder.folders.forEach(function (f) {
        if (f.name === gRemoteSyncFolder)
            remoteRoot = f;
    });
    // Create and return if the remote sync folder is not found.
    if (!remoteRoot)
        gss.createFolder(gss.rootFolder, gRemoteSyncFolder, sync.syncUp);
//    var localRoot = localFile.init(gSyncFolder);
//    if ()
}

sync.syncDown = function () {

}

sync.compare = function (local, remote) {
    var diff = local.modificationDate - remote.modificationDate;
    if (diff > 0) {
        sync.queue.push({   file: files[x],
				            folder: remoteFolder,
				            onstart: loadStartHandler,
				            onprogress: progressHandler,
				            onload: loadHandler,
				            onerror: errorHandler,
				            onabort: abortHandler
		});
    } else if (diff < 0) {
        sync.queue.push({   file: files[x],
                            nsIFile: nsIFile,
                            persist: persist
        });
    } else {
        // compare children?
    }
}

// The sync queue of upload and download requests for files.
sync.queue = [];
// The sync queue monitor used for locking.
sync.processingq = false;
// Processes the queue of pending uploads.
sync.processq = function () {
    if (sync.processingq) return;
    var work = sync.queue.shift();
    if (work && work.folder) {
        // This is an upload.
        sync.uploading = gss.uploadFile(work.file, work.folder, work.onstart,
	        work.onprogress, work.onload, work.onerror, work.onabort);
	} else if (work) {
        // This is a download.
        try {
            sync.downloading = work.persist;
            var now = (new Date()).toUTCString();
           	// Unfortunately single quotes are not escaped by default.
            var resource = work.file.uri.replace(/'/g, "%27");
            var authHeader = "Authorization: " + gss.username + " " +
                gss.sign('GET', now, resource, gss.authToken);
            var dateHeader = "X-GSS-Date: " + now;
            var headers = authHeader + "\r\n" + dateHeader + "\r\n";
		    var nsIURI = gIos.newURI(resource, "utf-8", null);
		    var result = work.persist.saveURI(nsIURI, null, null, null, headers, work.nsIFile);
		    if (result)
		        alert(result);
        } catch (e) {
            alert(e);
        }
    } else
        sync.processingq = false;
}

//setInterval(sync.processUploadq, 300);

sync.cancelAll = function () {
    sync.queue = [];
    if (sync.processingq && sync.processingq.folder) {
        sync.processingq.abort();
        sync.processingq = false;
    } else if (sync.processingq) {
        sync.processingq.cancelSave();
        sync.processingq = false;
    }
}

