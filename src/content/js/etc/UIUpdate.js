// The event queue of upload and download requests for files.
var eventq = [];
// The event queue monitor used for locking.
var qprocessing = false;
// Processes the queue of pending events.
function processq() {
    if (qprocessing) return;
    var event = eventq.shift();
    if (event) {
        if (event.type === 'upload')
            qprocessing = gss.uploadFile(event.file, event.folder.uri, event.onstart,
                event.onprogress, event.onload, event.onerror, event.onabort);
        else if (event.type === 'download') {
            try {
                qprocessing = event.persist;
                var now = (new Date()).toUTCString();
                // Unfortunately single quotes are not escaped by default.
                var resource = event.file.uri.replace(/'/g, "%27");
                var authHeader = "Authorization: " + gss.username + " " +
                    gss.sign('GET', now, resource, gss.authToken);
                var dateHeader = "X-GSS-Date: " + now;
                var headers = authHeader + "\r\n" + dateHeader + "\r\n";
                var nsIURI = gIos.newURI(resource, "utf-8", null);
                var result = event.persist.saveURI(nsIURI, null, null, null, headers, event.nsIFile);
                if (result)
                    alert(result);
            } catch (e) {
                alert(e);
            }
        }
    } else
        qprocessing = false;
}
setInterval(processq, 300);

function cancelAll() {
    eventq = [];
    if (qprocessing) {
        if (qprocessing.type === 'download') {
            qprocessing.cancelSave();
            qprocessing = false;
        } else if (qprocessing.type === 'upload') {
            qprocessing.abort();
            qprocessing = false;
        }
    }
}

// Display the 'working' indicator. If the progress parameter is  specified,
// use it as a percentage of the work completed.
function showWorking(progress) {
    gStatusMeter.setAttribute("mode", progress ? "determined" : "undetermined");
    gStatusMeter.setAttribute("value", progress || "100");
    gStatusPercent.label = progress || "";
}

// Hide the 'working' indicator.
function hideWorking() {
    gStatusMeter.setAttribute("mode", "determined");
    gStatusMeter.setAttribute("value", "0");
    gStatusPercent.label = "";
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
