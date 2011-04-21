function showHelp() {
//            window.openDialog("chrome://firegss/content/help.xul", "help",
//            "chrome,modal,dialog,centerscreen");
    runInFirefox("http://code.google.com/p/firegss");
}

function showBugs() {
    runInFirefox("http://code.google.com/p/firegss/issues/list");
}

function showAbout() {
    openDialog("chrome://firegss/content/about.xul", "about", "chrome,resizable=yes,centerscreen=yes", gVersion);
}
