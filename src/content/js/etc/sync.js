var sync;
if (!sync) sync = {};

sync.open = function () {
    if (gSyncFolder === "") {
        showPreferences({ tab: 2, next: sync.showSync });
    } else
        sync.showSync();
}

sync.showSync = function () {
    window.openDialog("chrome://firegss/content/sync.xul", "sync",
            "chrome,modal,dialog,centerscreen");
}

sync.init = function () {
    
}

sync.syncUp = function () {
//    gRemoteSyncFolder
}

sync.syncDown = function () {

}

// The sync queue of upload requests for files.
sync.uploadq = [];
// The sync upload queue monitor used for locking.
sync.uploading = false;
// Processes the queue of pending uploads.
sync.processUploadq = function () {
    if (sync.uploading) return;
    var upload = sync.uploadq.shift();
    if (upload) {
        sync.uploading = gss.uploadFile(upload.file, upload.folder, upload.onstart,
	        upload.onprogress, upload.onload, upload.onerror, upload.onabort);
    } else
        sync.uploading = false;
}
//setInterval(sync.processUploadq, 300);
// The sync queue of download requests for files.
sync.downloadq = [];
// The sync download queue monitor used for locking.
sync.downloading = false;
// Processes the queue of pending downloads.
sync.processDownloadq = function () {
    if (sync.downloading) return;
    var download = sync.downloadq.shift();
    if (download) {
        try {
            sync.downloading = download.persist;
            var now = (new Date()).toUTCString();
           	// Unfortunately single quotes are not escaped by default.
            var resource = download.file.uri.replace(/'/g, "%27");
            var authHeader = "Authorization: " + gss.username + " " +
                gss.sign('GET', now, resource, gss.authToken);
            var dateHeader = "X-GSS-Date: " + now;
            var headers = authHeader + "\r\n" + dateHeader + "\r\n";
		    var nsIURI = gIos.newURI(resource, "utf-8", null);
		    var result = download.persist.saveURI(nsIURI, null, null, null, headers, download.nsIFile);
		    if (result)
		        alert(result);
        } catch (e) {
            alert(e);
        }
    } else
        sync.downloading = false;
}
//setInterval(processDownloadq, 300);

sync.cancelAll = function () {
    sync.downloadq = [];
    sync.uploadq = [];
    if (sync.downloading) {
        sync.downloading.cancelSave();
        sync.downloading = false;
    }
    if (sync.uploading) {
        sync.uploading.abort();
        sync.uploading = false;
    }
}

