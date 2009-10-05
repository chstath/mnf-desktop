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
    theTab.setAttribute('firegss', "xyz");
    gBrowser.selectedTab = theTab;
    var func = function () { gBrowser.setIcon(theTab, "chrome://firegss/skin/icons/logo.png"); };
    setTimeout(func, 500);
  } else {
    toOpenWindowByType('mozilla:firegss', 'chrome://firegss/content/');
  }
}
