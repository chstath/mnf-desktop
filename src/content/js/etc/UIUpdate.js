// The queue of upload requests for files.
var uploadq = [];
// The upload queue monitor used for locking.
var uploading = false;
// Processes the queue of pending uploads.
function processUploadq() {
    if (uploading) return;
    var upload = uploadq.shift();
    if (upload) {
        uploading = gss.uploadFile(upload.file, upload.folder, upload.onstart,
	        upload.onprogress, upload.onload, upload.onerror, upload.onabort);
    } else
        uploading = false;
}
setInterval(processUploadq, 300);
// The queue of download requests for files.
var downloadq = [];
// The download queue monitor used for locking.
var downloading = false;
// Processes the queue of pending downloads.
function processDownloadq() {
    if (downloading) return;
    var download = downloadq.shift();
    if (download) {
        try {
            downloading = download.persist;
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
        downloading = false;
}
setInterval(processDownloadq, 300);

function cancelAll() {
    downloadq = [];
    uploadq = [];
    if (downloading) {
        downloading.cancelSave();
        downloading = false;
    }
    if (uploading) {
        uploading.abort();
        uploading = false;
    }
}

// Display the 'working' indicator. If the progress parameter is  specified,
// use it as a percentage of the work completed.
function showWorking(progress) {
    jQuery("#statusmeter").attr("mode", progress ? "determined" : "undetermined");
    // Trim the percent character appended by the call sites to the calculated
    // work percentage.
    jQuery("#statusmeter").val(progress.substr(0, progress.length-1) || "100");
    jQuery("#statuspct").attr("label", progress || "");
}

function hideWorking() {
    jQuery("#statusmeter").attr("mode", "determined");
    jQuery("#statusmeter").val("0");
    jQuery("#statuspct").attr("label", "");
}

window.setInterval(UIUpdate, 500);

function UIUpdate() {
  if (gLogQueue && gLogMode) {
    var scrollLog = gCmdlogBody.scrollTop + 50 >= gCmdlogBody.scrollHeight - gCmdlogBody.clientHeight;
    // update log
    gCmdlogBody.innerHTML += gLogQueue;

    gLogQueue = "";
    // don't keep too much log data or it will slow down things
    var nodeList = gCmdlogDoc.getElementsByTagName("div");
    var count    = 0;
    while (nodeList.length > 200 + count) {
      if (nodeList.item(count).getAttribute("type") == 'error') {
        ++count;
      } else {
        gCmdlogBody.removeChild(nodeList.item(count));
      }
    }

    if (scrollLog) {
      gCmdlogBody.scrollTop = gCmdlogBody.scrollHeight - gCmdlogBody.clientHeight;  // scroll to bottom
    }
  }
}
