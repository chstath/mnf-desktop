function getBrowser() {
    return document.getElementById('content');
}
var gBrowser = getBrowser();
dump(gBrowser+'\n');
var sl = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .createInstance(Components.interfaces.mozIJSSubScriptLoader);
sl.loadSubScript("chrome://firegss/content/js/etc/firegssOverlay.js");
loadFireGSS();
