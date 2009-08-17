/* ideas for this bit of gpl'ed code came from ieview (http://ieview.mozdev.org)
 * and that team is... Paul Roub, Ted Mielczarek, and Fabricio Campos Zuardi
 * thanks to Scott Bentley for the suggestion
 */

function loadFireGSS() {
  var prefService    = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  var prefSvc        = prefService.getBranch(null);

  var loadInTab      = false;
  try {
    loadInTab        = prefSvc.getIntPref("firegss.loadmode");
  } catch (ex) {
    loadInTab = true;
  }
  
  if (loadInTab) {
    var theTab          = gBrowser.addTab('chrome://firegss/content/');
    theTab.label        = "FireGSS";
    gBrowser.selectedTab = theTab;
    var func = function () { gBrowser.setIcon(theTab, "chrome://firegss/skin/icons/logo.png"); };
    setTimeout(func, 500);

    var nonce_callback = function (data, textStatus) {
      gss.nonce = data;
      var theTab          = gBrowser.addTab(gss.LOGIN_URL+'?nonce='+data);
      theTab.label        = "Login";
      gBrowser.selectedTab = theTab;
      // on tab close do:
      setTimeout(getToken, 10000);
    };
  
    jQuery.get(gss.NONCE_URL, {"user": gss.username}, nonce_callback, "text");
  } else {
    toOpenWindowByType('mozilla:firegss', 'chrome://firegss/content/');
  }
}

function getToken() {
  jQuery.get(gss.TOKEN_URL, {"user": gss.username, "nonce": gss.nonce}, token_callback, "text");
}

function token_callback(data, textStatus) {
  var cons = Components.classes["@mozilla.org/consoleservice;1"].
    	getService(Components.interfaces.nsIConsoleService);
  cons.logStringMessage("Got token: "+data);
}