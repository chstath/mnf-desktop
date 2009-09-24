function readPreferences() {
    window.sizeToContent();
}

// Select the local folder for sync.
function browseSyncFolder(title) {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, title ? title : $("strings").getString("selectFolder"), nsIFilePicker.modeGetFolder);
    var res = fp.show();

    if (res == nsIFilePicker.returnOK) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
            getService(Components.interfaces.nsIPrefService).getBranch("firegss.");
        prefs.setCharPref("syncfolder", fp.file.path);
    }

    return res == nsIFilePicker.returnOK;
}

