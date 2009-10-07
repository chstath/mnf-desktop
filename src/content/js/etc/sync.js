var sync;
if (!sync) sync = {};

sync.init = function () {
    if (gSyncFolder === "")
        showPreferences({ tab: 2, next: sync.checkPreconditions });
    else
        sync.checkPreconditions();
}

sync.checkPreconditions = function () {
    if (!gss.rootFolder.uri) {
        alert("You have to login first");
        return;
    }
    var found = false;
    gss.rootFolder.folders.forEach(function (elem) {
        if (elem.name === gRemoteSyncFolder)
            found = true;
    });
    if (!found) {
        // Create remote sync folder first.
        var callback = function(newFolder) {
            if (!newFolder)
                alert("Could not create " + gRemoteSyncFolder + " folder");
            else {
                remoteTree.updateView();
                for (var x = 0; x < remoteTree.rowCount; ++x) {
                  if (remoteTree.data[x].name == val) {
                    remoteTree.selection.select(x);
                    remoteTree.treebox.ensureRowIsVisible(x);
                    break;
                  }
                }
                sync.start();
            }
        };
        gss.createFolder(gss.rootFolder, gRemoteSyncFolder, callback);
    }
    sync.start();
}

sync.start = function () {
    var remoteRoot;
    gss.rootFolder.folders.forEach(function (f) {
        if (f.name === gRemoteSyncFolder)
            remoteRoot = f;
    });
    // Assert the existence of .sync for now. In the future this code will be
    // refactored anyway.
    if (!remoteRoot) {
        alert("No remote .sync found");
        return;
    }
    // Find the remote sync folder that corresponds to the local sync folder.
    var localRoot = localFile.init(gSyncFolder);
    var found = false;
    if (remoteRoot.folders)
        remoteRoot.folders.forEach(function (f) {
            if (f.name === localRoot.leafName) {
                remoteRoot = f;
                found = true;
            }
        });
    if (!found)
        sync.upload(localRoot, remoteRoot.uri);
    else
        sync.compareFolder(localRoot, remoteRoot);
    // Start processing the queued commands.
    sync.qprocess = setInterval(sync.processq, 300);
}

sync.compareFolder = function (local, remote) {
    var diff = local.lastModifiedTime - remote.modificationDate;
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

sync.compareFile = function (local, remote) {
    var diff = local.lastModifiedTime - remote.modificationDate;
    if (diff > 0)
        sync.upload(local, remote.folder.uri);
    else if (diff < 0)
        sync.download(local, remote);
}

// Uploads the specified local file or folder to the specified remote parent path.
sync.upload = function (local, remoteParent) {
    if (local.isDirectory()) {
        // TODO: recurse
    } else if (local.isSpecial()) {
        return;
    } else {
        // Symlinks will be copied as regular files.
        sync.queue.push({   file: local,
                            folder: remoteParent/*,
                            onstart: loadStartHandler,
                            onprogress: progressHandler,
                            onload: loadHandler,
                            onerror: errorHandler,
                            onabort: abortHandler*/
        });
    }
}

sync.download = function (local, remote) {
    if (remote.isFolder) {
        // TODO: recurse
    } else {
        sync.queue.push({   file: remote,
                            nsIFile: local,
                            persist: persist
        });
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
    } else {
        sync.processingq = false;
        clearInterval(sync.qprocess);
    }
}

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

