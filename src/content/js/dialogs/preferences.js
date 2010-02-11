var next;

function readPreferences() {
    window.sizeToContent();
    if (window.arguments && window.arguments[0]) {
        var tab = window.arguments[0].tab;
        next = window.arguments[0].next;
        var tabbox = $("tabbox");
        tabbox.selectedIndex = tab;
    }
}

// Select the local folder for sync.
function browseSyncFolder(title) {
    var nsIFilePicker = Ci.nsIFilePicker;
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, title ? title : $("strings").getString("selectFolder"),
            nsIFilePicker.modeGetFolder);
    var res = fp.show();

    if (res == nsIFilePicker.returnOK) {
        var prefs = Cc["@mozilla.org/preferences-service;1"].
            getService(Ci.nsIPrefService).getBranch("firegss.");
        prefs.setCharPref("syncfolder", fp.file.path);
    }

    return res == nsIFilePicker.returnOK;
}

function onAccept() {
    if (next)
        opener.setTimeout(next, 200);
    return true;
}
