function sync() {
    if (gSyncFolder === "") {
        showPreferences({ tab: 2, next: showSync });
    } else
        showSync();
}

function showSync() {
    window.openDialog("chrome://firegss/content/sync.xul", "sync",
            "chrome,modal,dialog,centerscreen");

}

function init() {
    
}

function syncUp() {

}

function syncDown() {

}
