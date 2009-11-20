function readPreferences(startup) {
  try {
    gDefaultAccount = gPrefs.getComplexValue("defaultaccount", Components.interfaces.nsISupportsString).data;
    gBytesMode = gPrefs.getBoolPref("bytesmode");
    gConcurrent = gPrefs.getIntPref ("concurrent");
    gDebugMode = gPrefs.getBoolPref("debugmode");
    gDisableDestructMode = gPrefs.getBoolPref("destructmode");
    gDonated = gPrefs.getBoolPref("donated");
    gErrorMode = gPrefs.getBoolPref("errormode");
    gInterfaceMode = gPrefs.getIntPref ("interfacemode");
    gLogErrorMode = gPrefs.getBoolPref("logerrormode");
    gLogMode = gPrefs.getBoolPref("logmode");
    gLogQueueMode = gPrefs.getIntPref ("logqueue");
    gNoPromptMode = gPrefs.getBoolPref("nopromptmode");
    gPasswordMode = gPrefs.getBoolPref("passwordmode");
    gUsernameMode = gPrefs.getBoolPref("usernamemode");
    gRefreshMode = gPrefs.getBoolPref("refreshmode");
    gOpenMode = gPrefs.getIntPref ("openmode");
    gSyncSchedule = gPrefs.getIntPref("schedule");
    gSyncFolder = gPrefs.getCharPref("syncfolder");
    gHiddenMode = gPrefs.getBoolPref("hiddenmode");
    
    gss.SERVER = gPrefs.getCharPref("service.server");
    gss.SERVICE_URL = 'http://' + gss.SERVER + gPrefs.getCharPref("service.servicepath");
    gss.LOGIN_URL = 'https://' + gss.SERVER + gPrefs.getCharPref("service.loginpath");
    gss.LOGOUT_URL = 'https://' + gss.SERVER + gPrefs.getCharPref("service.logoutpath");
    gss.TOKEN_URL = 'https://' + gss.SERVER + gPrefs.getCharPref("service.servicepath") + 'token';
    gss.API_URL = gss.SERVICE_URL + 'rest';
    gss.SEARCH_URL = gss.API_URL + '/search/';
    gss.NONCE_URL = gss.SERVICE_URL + 'nonce';
    
    if (gPrefs.getComplexValue("folder", Components.interfaces.nsISupportsString).data == "") {
      var file = Components.classes["@mozilla.org/file/directory_service;1"].createInstance(Components.interfaces.nsIProperties)
                           .get("Home", Components.interfaces.nsILocalFile);

      var sString  = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
      if (file.path.indexOf('/') != -1) {
        sString.data = file.path.substring(0, file.path.indexOf('/') + 1);
      } else if (file.path.indexOf('\\') != -1) {
        sString.data = file.path.substring(0, file.path.indexOf('\\') + 1);
      }
      gPrefs.setComplexValue("folder", Components.interfaces.nsISupportsString, sString);
    }

    if (startup) {
      gLocalPath.value = gPrefs.getComplexValue("folder", Components.interfaces.nsISupportsString).data;
      gLoadUrl         = gPrefs.getComplexValue("loadurl", Components.interfaces.nsISupportsString).data;
    }

    updateInterface();
    updateOpenMode();

    $('logqueue').collapsed = !gLogMode;
    $('logsplitter').state  =  gLogMode ? 'open' : 'collapsed';
    $('logbutton').checked  =  gLogMode;

    $('logQueueTabs').selectedIndex = gLogQueueMode;

    var asciiList = gPrefs.getComplexValue("asciifiles", Components.interfaces.nsISupportsString).data;
    asciiList     = asciiList.split(",");
    for (var x = 0; x < gMaxCon; ++x) {
      for (var y = 0; y < asciiList.length; ++y) {
        gConnections[x].asciiFiles.push(asciiList[y]);
      }
    }

  } catch (ex) {
    debug(ex);
  }
}

function showPreferences(args) {
  var branch = gPrefsService.getBranch("browser.");
  var instantApply = branch.getBoolPref("preferences.instantApply");
  window.openDialog("chrome://firegss/content/preferences.xul", "preferences",
        "chrome,resizable,centerscreen" + (instantApply ? ",dialog=no" : ",modal,dialog"), args);
}

var prefsObserver = {
  observe : function(prefsbranch, topic, data) {
    readPreferences();

    if (data == "firegss.bytesmode") {
      localTree.updateView();

      if (gss.hasAuthenticated()) {
        remoteTree.updateView();
      }
    } else if (data == "firegss.logerrormode") {
      if (gLogErrorMode) {
        showOnlyErrors();
      } else {
        showAll();
      }
    } else if (data == "firegss.hiddenmode") {
      if (!gHiddenMode) {
        var file        = localFile.init(gLocalPath.value);
        var hiddenFound = false;

        while (true) {
          if (file.isHidden() && file.path != localDirTree.data[0].path) {
            hiddenFound = true;
            break;
          }

          if (!(parent in file) || file.path == file.parent.path) {
            break;
          }

          file = file.parent;
        }

        if (hiddenFound) {
          gLocalPath.value = localDirTree.data[0].path;
        }
      } else if (data.indexOf("firegss.service.") != -1) {
          logout();
      }

      localDirTree.data     = new Array();
      localDirTree.treebox.rowCountChanged(0, -localDirTree.rowCount);
      localDirTree.rowCount = 0;
      localDirTree.changeDir(gLocalPath.value);

      if (gss.hasAuthenticated()) {
        remoteTree.refresh();
      }
    }
  }
};
