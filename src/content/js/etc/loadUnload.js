function startup() {
  if (gStrbundle) {                            // we get two onload events b/c of the embedded browser
    return;
  }
  
  window.onerror         = detailedError;
  gStrbundle             = $("strings");
  gConnectButton         = $('connectbutton');
  gAccountField          = $('account');
  gFolderField           = $('folder');
  gLocalPath             = $('localpath');
  gLocalTree             = $('localtree');
  gLocalDirTree          = $('localdirtree');
  gLocalTreeChildren     = $('localtreechildren');
  gLocalDirTreeChildren  = $('localdirtreechildren');
  gRemotePath            = $('remotepath');
  gRemoteTree            = $('remotetree');
  gRemoteDirTree         = $('remotedirtree');
  gRemoteTreeChildren    = $('remotetreechildren');
  gRemoteDirTreeChildren = $('remotedirtreechildren');
  gCmdlogDoc             = $('cmdlog').contentWindow.document;
  gCmdlogBody            = $('cmdlog').contentWindow.document.body;
  gQueueTree             = $('queuetree');
  gQueueTreeChildren     = $('queuetreechildren');
  gStatusBytes           = $('statusbytes');
  gStatusElapsed         = $('statuselapsed');
  gStatusRemaining       = $('statusremaining');
  gStatusRate            = $('statusrate');
  gStatusMeter           = $('statusmeter');
  gLocalTree.view        = localTree;
  gLocalDirTree.view     = localDirTree;
  gRemoteTree.view       = remoteTree;
  gRemoteDirTree.view    = remoteDirTree;
  gQueueTree.view        = queueTree;

  gProfileDir            = Components.classes["@mozilla.org/file/directory_service;1"].createInstance(Components.interfaces.nsIProperties)
                                     .get("ProfD", Components.interfaces.nsILocalFile);
  gAtomService           = Components.classes["@mozilla.org/atom-service;1"].getService            (Components.interfaces.nsIAtomService);
  gLoginManager          = Components.classes["@mozilla.org/login-manager;1"].getService           (Components.interfaces.nsILoginManager);
  gIos                   = Components.classes["@mozilla.org/network/io-service;1"].getService      (Components.interfaces.nsIIOService);
  gPromptService         = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  gPrefsService          = Components.classes["@mozilla.org/preferences-service;1"].getService     (Components.interfaces.nsIPrefService);
  //gfiregssUtils          = Components.classes['@nightlight.ws/firegssutils;1'].getService          (Components.interfaces.nsIfiregssUtils);
  gFormHistory           = Components.classes["@mozilla.org/satchel/form-history;1"].getService    (Components.interfaces.nsIFormHistory ?
                                                                                                    Components.interfaces.nsIFormHistory :
                                                                                                    Components.interfaces.nsIFormHistory2);
  gLoginInfo             = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",     Components.interfaces.nsILoginInfo, "init");

  gPrefs                 = gPrefsService.getBranch("firegss.");
  gPlatform              = getPlatform();

  if (gPrefsService instanceof Components.interfaces.nsIPrefBranchInternal) {
    gPrefsService.addObserver("firegss", prefsObserver, false);
  }

  gMaxCon                = gPrefs.getIntPref("concurrentmax");

  gConnections           = new Array();
  for (var x = 0; x < gMaxCon; ++x) {
    gConnections.push(new ftpMozilla(x ? new transferObserver(x + 1) : ftpObserver));
    gConnections[x].type            = x ? 'transfer' : '';
    gConnections[x].connNo          = x + 1;
    gConnections[x].errorConnectStr = gStrbundle.getString("errorConn");
    gConnections[x].errorXCheckFail = gStrbundle.getString("errorXCheckFail");
    gConnections[x].passNotShown    = gStrbundle.getString("passNotShown");
    gConnections[x].l10nMonths      = gStrbundle.getString("months").split("|");
  }

  gFtp                   = gConnections[0];
  gFtp.setSecurity("");

  gTransferTypes         = new Array(gStrbundle.getString("auto"), gStrbundle.getString("binary"), gStrbundle.getString("ascii"));
  gMonths                = gStrbundle.getString("months").split("|");

  treeHighlighter.valid  = new Array({ tree: gLocalTree,  children: gLocalTreeChildren,  column: "localname"  },
                                     { tree: gRemoteTree, children: gRemoteTreeChildren, column: "remotename" },
                                     { tree: gQueueTree,  children: gQueueTreeChildren });

  if ($('searchWhich').selectedIndex == -1) {
    $('searchWhich').selectedIndex = 0;
  }

  searchSelectType();
  showSearchDates();
  securityPopup();

  readPreferences(true);
  setConnectButton(true);
  accountButtonsDisabler(true);
  connectedButtonsDisabler();
  localDirTree.changeDir('/');
  loadSiteManager(true);
  loadPrograms();

  var trht = 'http://code.google.com/p/gss';
  appendLog("<span id='opening' style='line-height:16px'><span style='cursor:pointer;text-decoration:underline;color:blue;' onclick=\"window.open('http://code.google.com/p/gss','FireGSS');\">"
      + "FireGSS</span> <span>" + gVersion
      + "</span>"
      + "</span><br style='font-size:5pt'/><br style='font-size:5pt'/>", 'blue', "info");
  gCmdlogBody.scrollTop = 0;

  onAccountChange(gDefaultAccount);
//  setTimeout("gAccountField.focus()", 0);

  //tipJar();
  jQuery('#username').formHints({'className':'hint'});

  setTimeout(doResizeHack, 0);

  if (gLoadUrl) {
    setTimeout("externalLink()", 1000);
  }
}

function doDesktopLogin() {
  var cons = Components.classes["@mozilla.org/consoleservice;1"].
      getService(Components.interfaces.nsIConsoleService);

  var showLogin = function (data) {
    gss.nonce = data.trim();
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
         .getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");
    var gBrowser = mainWindow.getBrowser();
    var theTab = gBrowser.addTab(gss.LOGIN_URL+'?nonce='+gss.nonce);
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
            switch (req.status) {
              case 200:
                gss.authToken = req.responseText.trim();
                var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
                var mainWindow = wm.getMostRecentWindow("navigator:browser");
                var gBrowser = mainWindow.getBrowser();
                gBrowser.removeCurrentTab();
                returnToFireGSSTab('firegss');
                jQuery("#username").attr("readonly", "true");
                gss.fetchRootFolder(remoteDirTree.initialize);
                break;
              case 403:
                alert("No matching token was found");
                break;
              default:
                alert("Error getting token. req.status="+req.status);
            }
	      }
	    };
	    req.send(null);
      }
    }, true);
  };
  jQuery.ajax({
    url: gss.NONCE_URL,
    data: {user: gss.username},
    success: showLogin,
    dataType: "text",
    error: function(request, status, error){
      if (request.status === 403)
        alert("Username not found");
    }
  });
}

function beforeUnload() {
  return "";
}

function unload() {
  if (gPrefsService instanceof Components.interfaces.nsIPrefBranchInternal) {
    gPrefsService.removeObserver("firegss", prefsObserver, false);
  }

  for (var x = 0; x < gMaxCon; ++x) {
    if (gConnections[x].isConnected) {
      gConnections[x].disconnect();
    }
  }

  if (gFxp && gFxp.isConnected) {
    gFxp.disconnect();
  }

  for (var x = 0; x < gTempEditFiles.length; ++x) {
    gfiregssUtils.removeFile(gTempEditFiles[x].file);
  }
}

function returnToFireGSSTab(attrName) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
  for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().getBrowser();
       index < tabbrowser.mTabs.length && !found; index++) {

    // Get the next tab
    var currentTab = tabbrowser.mTabs[index];
    // Does this tab contain our custom attribute?
    if (currentTab.hasAttribute(attrName)) {
      // Yes--select and focus it.
      tabbrowser.selectedTab = currentTab;
      // Focus *this* browser in case another one is currently focused
      tabbrowser.focus();
      found = true;
    }
  }
  return currentTab;
}

function login(event) {
  event = event.trim();
  var hint = "Username?";
  if (event === hint || event === '')
    alert("Enter a username first");
  else if (gss.username !== event) {
    gss.username = event;
    gss.authToken = '';
    doDesktopLogin();
  }
}

function logout() {
  if (gss.username === '') return;
  gss.username = gss.authToken = '';
  jQuery("#username").val("");
  jQuery("#username").removeAttr("readonly");
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
       .getService(Components.interfaces.nsIWindowMediator);
  var mainWindow = wm.getMostRecentWindow("navigator:browser");
  var gBrowser = mainWindow.getBrowser();
  var theTab = gBrowser.addTab(gss.LOGOUT_URL);
  theTab.label = "Logout";
  gBrowser.selectedTab = theTab;
  // Clear Shibboleth cookies after logout is complete, so that restarting
  // the browser is unnecessary.
  var newTabBrowser = gBrowser.getBrowserForTab(theTab);
    newTabBrowser.addEventListener("load", function() {
      var cookieMgr = Components.classes["@mozilla.org/cookiemanager;1"]
                 .getService(Components.interfaces.nsICookieManager);
      for (var e = cookieMgr.enumerator; e.hasMoreElements();) {
        var cookie = e.getNext().QueryInterface(Components.interfaces.nsICookie);
        if (cookie.host === gss.SERVER && (cookie.name.indexOf("_shibstate") == 0
                                      || cookie.name.indexOf("_shibsession") == 0)) {
          cookieMgr.remove(cookie.host, cookie.name, cookie.path, false);
        }
      }
    }, true);
}
