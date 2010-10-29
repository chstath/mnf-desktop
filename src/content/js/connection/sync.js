var sync;
if (!sync) sync = {};

sync.folderQueue = [];

sync.init = function () {
    if (gSyncFolder === "")
        showPreferences({ tab: 2, next: sync.checkPreconditions });
    else
        sync.checkPreconditions();
}

sync.startSpin = function () {
    jQuery('#syncbutton').attr('image', 'chrome://firegss/skin/icons/syncing.gif');
}

sync.stopSpin = function () {
    jQuery('#syncbutton').attr('image', 'chrome://firegss/skin/icons/sync.png');
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
    sync.startSpin();
    if (!found) {
        // Create remote sync folder first.
        var callback = function(newFolder) {
            if (!newFolder) {
                sync.stopSpin();
                alert("Could not create " + gRemoteSyncFolder + " folder");
            } else {
                remoteTree.updateView();
                sync.ensureCachedRemoteSync();
            }
        };
        gss.createFolder(gss.rootFolder, gRemoteSyncFolder, callback);
    } else {
        sync.ensureCachedRemoteSync();
    }
}

sync.ensureCachedRemoteSync = function () {
    var remoteRoot;
    gss.rootFolder.folders.forEach(function (f) {
        if (f.name === gRemoteSyncFolder)
            remoteRoot = f;
    });
    // Assert the existence of .sync for now. In the future this code will be
    // refactored anyway.
    if (!remoteRoot) {
        sync.stopSpin();
        alert("No remote .sync found");
        return;
    }
    // Find the remote sync folder that corresponds to the local sync folder.
    var localRoot = localFile.init(gSyncFolder);
    var start = function () {
        return function () {
            var found = false;
            remoteRoot.folders.forEach(function (f) {
                if (f.name === localRoot.leafName) {
                    remoteRoot = f;
                    found = true;
                }
            });
            if (!found) {
                sync.upload(localRoot, remoteRoot);
                sync.stopSpin();
            }
            else {
                gss.fetchFolder(remoteRoot, function() {
                    sync.syncFolders(localRoot, remoteRoot)
                });
            }
        };
    }();
    gss.fetchFolder(remoteRoot, start);
}

// Uploads the specified local file or folder to the specified remote parent folder.
sync.upload = function (local, remoteParent) {
    var startUpload = function (args) {
        var l = args[0];
        var r = args[1];
        var t = new transfer();
        t.prompt = false;
        t.start(false, l, l.parent.path, r);
    };
    gss.fetchFolder(remoteParent, startUpload, [local, remoteParent]);
}

// Downloads the specified remote file or folder to the specified local file or folder.
sync.download = function (local, remote) {
    var startDownload = function (args) {
        var l = args[0];
        var r = args[1];
        var t = new transfer();
        var remoteFolder = r.isFolder? r.parent: r.folder;
        t.prompt = false;
        t.start(true, r, l.path, remoteFolder);
    };
    if (remote.isFolder) {
        gss.fetchFolder(remote, startDownload, [local, remote]);
    }
    else if (!remote.isFolder && !remote.folder) {
        gss.fetchFile(remote, startDownload, [local, remote]);
    }
    else {
        startDownload([local, remote]);
    }
}

sync.syncFolders = function (localFolder, remoteFolder) {
    //Check files
    var localChildren = localFolder.directoryEntries;
    while (localChildren.hasMoreElements()) {
        var lf = localChildren.getNext().QueryInterface(Ci.nsILocalFile);
        if (lf.isDirectory()) {
            // Check remote folders.
            var found = false;
            var remoteFound;
            if (remoteFolder.folders)
                remoteFolder.folders.forEach(function (f) {
                    if (f.name === lf.leafName) {
                        found = true;
                        remoteFound = f;
                    }
                });
            if (!found) //Upload local folder into remote folder
                sync.folderQueue.push({localFolder: lf, remoteFolder: remoteFolder, type: "upload"});
            else { //Sync local and remote folder
                sync.folderQueue.push({localFolder: lf, remoteFolder: remoteFound, type: "sync"});
            }
        } else if (lf.isFile() || lf.isSymlink()) {
            // Check remote files.
            found = false;
            var remoteFile;
            if (remoteFolder.files)
                remoteFolder.files.forEach(function (f) {
                        if (f.name === lf.leafName) {
                            found = true;
                            remoteFile = f;
                        }
                });
            if (!found)
                sync.upload(lf, remoteFolder);
            else {
                sync.syncFiles(lf, remoteFile);
            }
        }
    }
    if (remoteFolder.folders) {
        for (var i=0; i<remoteFolder.folders.length; i++) {
            var f = remoteFolder.folders[i];
            // Find the relevant local folder.
            var localFolders = localFolder.directoryEntries;
            var found = false;
            while (localFolders.hasMoreElements()) {
                var lf = localFolders.getNext().QueryInterface(Ci.nsILocalFile);
                if (lf.leafName === f.name && lf.isDirectory()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                // TODO: download new remote folders only if not deleted locally
                //Download remote folder into local folder
                sync.folderQueue.push({localFolder: localFolder, remoteFolder: f, type: "download"});
            }
        }
    }
    if (remoteFolder.files) {
        for (i=0; i<remoteFolder.files.length; i++) {
            var f = remoteFolder.files[i];
            // Find the relevant local file.
            var localFiles = localFolder.directoryEntries;
            var found = false;
            while (localFiles.hasMoreElements()) {
                var lf = localFiles.getNext().QueryInterface(Ci.nsILocalFile);
                if (lf.leafName === f.name && !lf.isDirectory()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                // TODO: download new remote files only if not deleted locally
                var newFile = localFile.init(localFolder.path);
                newFile.append(f.name);
                sync.download(newFile, f);
            }
        }
    }
    sync.processFolderQueue();
}

sync.processFolderQueue = function () {
    var obj = sync.folderQueue.pop();
    if (obj) {
        if (obj.type === "sync") {
            var start = function () {
                sync.syncFolders(obj.localFolder, obj.remoteFolder);
            };
            gss.fetchFolder(obj.remoteFolder, start);
        }
        else if (obj.type === "upload") {
            sync.upload(obj.localFolder, obj.remoteFolder);
            sync.processFolderQueue();
        }
        else {
            sync.download(obj.localFolder, obj.remoteFolder)
            sync.processFolderQueue();
        }
    }
    else {
        sync.stopSpin();
    }
}

sync.syncFiles = function (localFile, remoteFile) {
    var diff = localFile.lastModifiedTime - remoteFile.modificationDate;
    if (diff > 0)
        sync.upload(localFile, remoteFile.folder);
    else if (diff < 0)
        sync.download(localFile, remoteFile);
}
