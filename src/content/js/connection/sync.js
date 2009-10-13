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
    else
        gss.fetchFolder(remoteRoot, function () {
            if (!found)
                //sync.upload(localRoot, remoteRoot.uri);
                new transfer().start(false, localRoot, localRoot.parent.path, remoteRoot);
            else
                sync.compareFolder(localRoot, remoteRoot);
            // Start processing the queued commands.
            //sync.qprocess = setInterval(sync.processq, 300);
        });
}

sync.compareFolder = function (local, remote) {
    var diff = local.lastModifiedTime - remote.modificationDate;
//    if (diff > 0) {
        /*sync.queue.push({   file: files[x],
                            folder: remoteFolder,
                            onstart: loadStartHandler,
                            onprogress: progressHandler,
                            onload: loadHandler,
                            onerror: errorHandler,
                            onabort: abortHandler
        });*/
//        alert("Local folder " + local.leafName + " is newer");
//    } else if (diff < 0) {
        /*sync.queue.push({   file: files[x],
                            nsIFile: nsIFile,
                            persist: persist
        });*/
//        alert("Remote folder " + remote.name + " is newer");
//    } else {
        // Compare children.
        // First we fetch updates.
        // Check remote folders.
        if (remote.folders)
            remote.folders.forEach(function (f) {
                // Find the relevant local folder.
                let localFolders = local.directoryEntries;
                while (localFolders.hasMoreElements()) {
                    let lf = localFolders.getNext().QueryInterface(Ci.nsILocalFile);
                    if (lf.leafName === f.name && lf.isDirectory()) {
                        sync.compareFolder(lf, f);
                        break;
                    }
                }
                if (!found) {
                    // TODO: download new remote folders only if not deleted locally
                    let newFile = local.append(f.name);
                    new transfer().start(true, newFile, newFile.parentPath, f);
                }
            });
        // Check remote files.
        if (remote.files)
            remote.files.forEach(function (f) {
                // Find the relevant local file.
                let localFiles = local.directoryEntries;
                let found = false;
                while (localFiles.hasMoreElements()) {
                    let lf = localFiles.getNext().QueryInterface(Ci.nsILocalFile);
                    if (lf.leafName === f.name && !lf.isDirectory()) {
                        found = true;
                        sync.compareFile(lf, f);
                        break;
                    }
                }
                if (!found) {
                    // TODO: download new remote files only if not deleted locally
                    let newFile = local.append(f.name);
                    new transfer().start(true, newFile, newFile.parent.path, f);
                }
            });
        // Then we push updates for new local files and folders.
        let localChildren = local.directoryEntries;
        while (localChildren.hasMoreElements()) {
            let lf = localChildren.getNext().QueryInterface(Ci.nsILocalFile);
            if (lf.isDirectory()) {
                // Check remote folders.
                let found = false;
                if (remote.folders)
                    remote.folders.forEach(function (f) {
                        if (f.name === lf.leafName)
                            found = true;
                    });
                if (!found)
                    new transfer().start(false, lf, lf.parent.path, remote);
            } else if (!lf.isSpecial()) {
                // Check remote files.
                let found = false;
                if (remote.files)
                    remote.files.forEach(function (f) {
                        if (f.name === lf.leafName)
                            found = true;
                    });
                if (!found)
                    new transfer().start(false, lf, lf.parent.path, remote);
            }
        }
//    }
}

sync.compareFile = function (local, remote) {
    var diff = local.lastModifiedTime - remote.modificationDate;
    if (diff > 0)
        new transfer().start(false, local, local.parent.path, remote.folder);
        //sync.upload(local, remote.folder.uri);
    else if (diff < 0)
        new transfer().start(true, local, local.parent.path, remote.folder);
        //sync.download(local, remote);
}

// Uploads the specified local file or folder to the specified remote parent path.
sync.upload = function (local, remoteParent) {
    if (local.isDirectory()) {
        // TODO: recurse
        sync.queue.push({ command: "upload-folder",
                          folder: local.leafName,
                          parent: remoteParent,
                          local:  local
        });
    } else if (local.isSpecial()) {
        return;
    } else {
        // Symlinks will be copied as regular files.
        sync.queue.push({ command: "upload-file",
                          file: local,
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
        sync.queue.push({ command: "download-file",
                          file: remote,
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
    // Lock processing queue.
    if (sync.processingq) return;
    // Clean up queue processing.
    if (sync.queue.length === 0) {
        sync.processingq = false;
        clearInterval(sync.qprocess);
        return;
    }
    // Process next item.
    var work = sync.queue.shift();
    switch (work.command) {
    case "upload-file":
        sync.uploading = gss.uploadFile(work.file, work.folder, work.onstart,
            work.onprogress, work.onload, work.onerror, work.onabort);
        break;
    case "download-file":
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
        break;
    case "upload-folder":
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
                if (work.local.folders)
                    work.local.folders.forEach(function (f) {
                        sync.upload(f);
                    });
                if (work.local.files)
                    work.local.files.forEach(function (f) {
                        sync.upload(f);
                    });
            }
        };
        gss.createFolder(work.parent, work.folder, callback);
        break;
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
