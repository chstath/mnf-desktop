/* ideas for this bit of gpl'ed code came from ieview (http://ieview.mozdev.org)
 * and that team is... Paul Roub, Ted Mielczarek, and Fabricio Campos Zuardi
 * thanks to Scott Bentley for the suggestion
 */

function loadFireGSS() {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService).getBranch(null);
  var cons = Components.classes["@mozilla.org/consoleservice;1"].
      getService(Components.interfaces.nsIConsoleService);

  var loadInTab = false;
  try {
    loadInTab = prefs.getIntPref("firegss.loadmode");
  } catch (ex) {
    loadInTab = true;
  }
  
  var showLogin = function (data) {
    gss.nonce = data;
    //if (loadInTab) {
    var theTab = gBrowser.addTab(gss.LOGIN_URL+'?nonce='+data);
    theTab.label = "Login";
    gBrowser.selectedTab = theTab;
    var newTabBrowser = gBrowser.getBrowserForTab(theTab);
    newTabBrowser.addEventListener("load", function() {
      var index;
      if ((index = newTabBrowser.contentDocument.body.innerHTML.indexOf("You can now close")) !== -1) {
   	    var req = new XMLHttpRequest();
	    req.open('GET', gss.TOKEN_URL+'?user='+gss.username+'&nonce='+gss.nonce, true);
	    req.onreadystatechange = function (aEvt) {
	      if (req.readyState == 4) {
            if(req.status == 200) {
              gss.authToken = req.responseText;
              var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
              var mainWindow = wm.getMostRecentWindow("navigator:browser");
              var gBrowser = mainWindow.getBrowser();
              gBrowser.removeCurrentTab();
              var theTab = gBrowser.addTab('chrome://firegss/content/');
              theTab.label = "FireGSS";
              gBrowser.selectedTab = theTab;
              var func = function () { gBrowser.setIcon(theTab, "chrome://firegss/skin/icons/logo.png"); };
              setTimeout(func, 500);
            } else
              cons.logStringMessage("Error getting token. req.status="+req.status);
	      }
	    };
	    req.send(null);
      }
    }, true);
    //} else {
      //toOpenWindowByType('mozilla:firegss', 'chrome://firegss/content/');
    //}
  };

  jQuery.get(gss.NONCE_URL, {"user": gss.username}, showLogin, "text");
}
