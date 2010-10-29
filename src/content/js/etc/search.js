var searchFiles  = new Array();

function showSearch(show) {
  $('searchToolbar').setAttribute("collapsed", !show);
    searchSelectType();

  if (show) {
    $('searchFile').focus();
    $('searchFile').select();
  } else {
    if (localTree.searchMode) {
      localTree.updateView();
    }
    if (remoteTree.searchMode) {
      remoteTree.updateView();
    }
  }
}

function searchSelectType() {
  $('searchButton').disabled   =  $('searchWhich').selectedIndex == 1 && !gss.hasAuthenticated();
  $('searchMenu').setAttribute("collapsed", $('searchWhich').selectedIndex == 1);
}

function showSearchDates() {
  $('searchDateBox').collapsed = !$('searchDates').getAttribute('checked');
}

function searchWrapper() {
  gSearchRemoteUpdate = false;

  if (gSearchRunning) {
    gSearchRunning = false;
    --gProcessing;
    $('searchFile').disabled = false;
    $('searchButton').label = gStrbundle.getString("search");
    $('searchFile').focus();
    return;
  }

  searchFiles = new Array();
  gSearchType = $('searchWhich').selectedIndex;
  search();
}

function search(){
    if (gSearchType){
        //remote search
        searchRemote();
    }
    else{
        //local search
        searchInFiles();
    }
}

function viewRemoteSearchResults(){
  if (searchFiles.length) {                                                          // update the view with the new results
    gSearchFound = true;
    remoteTree.updateView2(searchFiles);
  }
  else{
      notifyForNotFound();
  }
}

function setResults(){
    var results = arguments[0];
    for (var i=0; i<results.length; i++){
        searchFiles.push(results[i]);
    }
    viewRemoteSearchResults();
    
    gSearchRunning = false;
  --gProcessing;
  $('searchFile').disabled = false;
  $('searchFile').focus();
  $('searchButton').label = gStrbundle.getString("search");

}

function searchRemote(){
    gSearchName = $('searchFile').value;

    if (!$('searchFile').value){
      if (remoteTree.searchMode) {
        remoteTree.updateView();
      }
      return;
    }

    $('searchFile').removeAttribute("status");
    $('searchStatusIcon').removeAttribute("status");
    $('searchStatus').value  = '';
    $('searchButton').focus();
    $('searchFile').disabled = true;
    $('searchButton').label  = gStrbundle.getString("searchStop");

    gss.search(gSearchName, setResults);
}

function notifyForNotFound(){
    $('searchFile').setAttribute("status",       "notfound");
    $('searchStatusIcon').setAttribute("status", "notfound");
    $('searchStatus').value = gStrbundle.getString("notFound");
}

function searchInFiles(subFolder){
    gSearchFound     = false;
    gSearchCallbacks = new Array();
    gSearchName      = $('searchFile').value;
//    gSearchType      = $('searchWhich').selectedIndex;
    gSearchRecursive = $('searchSubdir').getAttribute('checked');
    gSearchMatchCase = $('searchMatchCase').getAttribute('checked');
    gSearchRegExp    = $('searchRegExp').getAttribute('checked');
    gSearchFrom      = $('searchDateFrom').dateValue;
    gSearchTo        = $('searchDateTo').dateValue;
    gSearchFrom.setHours(0); gSearchFrom.setMinutes(0); gSearchFrom.setSeconds(0); gSearchFrom.setMilliseconds(0);
    gSearchTo.setHours(0);   gSearchTo.setMinutes(0);   gSearchTo.setSeconds(0);   gSearchTo.setMilliseconds(0);
    gSearchDates     = $('searchDates').getAttribute('checked');

    if (!$('searchFile').value && !gSearchDates) {
      if (localTree.searchMode) {
        localTree.updateView();
      }

      if (remoteTree.searchMode) {
        remoteTree.updateView();
      }
      return;
    }

    if (!gSearchRegExp) {                                                               // extract the search terms
      gSearchName    = gSearchName.replace(/'/g, '"');

      var quote = false;
      for (var x = 0; x < gSearchName.length; ++x) {
        if (gSearchName.charAt(x) == '"' || gSearchName.charAt(x) == "'") {
          quote = !quote;
        } else if (gSearchName.charAt(x) == ' ' && quote) {
          gSearchName = setCharAt(gSearchName, x, "/");
        } else if (gSearchName.charAt(x) == ',' && !quote) {
          gSearchName = setCharAt(gSearchName, x, " ");
        } else if (gSearchName.charAt(x) == '*' && !quote) {
          gSearchName = setCharAt(gSearchName, x, " ");
        }
      }

      gSearchName    = gSearchName.replace(/"/g, "");
      gSearchName    = gSearchName.split(" ").filter(removeBlanks);

      for (var x = 0; x < gSearchName.length; ++x) {
        gSearchName[x] = trim(gSearchName[x]).replace(/\//g, " ");
      }
    }

    if (!gSearchType && localTree.searchMode) {
      localTree.updateView();
    } else if (gSearchType && remoteTree.searchMode && !gSearchRemoteUpdate) {
      gSearchRemoteUpdate = true;
      remoteTree.extraCallback = search;
      remoteTree.updateView();
    }

     gSearchRunning = true;
    ++gProcessing;
    $('searchFile').removeAttribute("status");
    $('searchStatusIcon').removeAttribute("status");
    $('searchStatus').value  = '';
    $('searchButton').focus();
    $('searchFile').disabled = true;
    $('searchButton').label  = gStrbundle.getString("searchStop");

    var files = new Array();

    
        if (subFolder){
            var dir = localFile.init(subFolder.path);
            var entries = dir.directoryEntries;
            while (entries.hasMoreElements()){
                var entry = entries.getNext();
                entry.QueryInterface(Components.interfaces.nsIFile);
                files.push(entry);
            }
        }
        else{
          for (var x = 0; x < localTree.data.length; ++x) {
            files.push(localTree.data[x]);
          }
        }
    
    var allMinus = true;
    var regEx;

    
    for (var y = 0; y < gSearchName.length; ++y) {
        if (gSearchName[y].charAt(0) != '-') {
            allMinus = false;
            break;
        }
    }

    if (gSearchRegExp) {
        regEx = new RegExp(gSearchName, gSearchMatchCase ? "" : "i");
    }

        for (var x = 0; x < files.length; ++x) {                                              // do the search!
        var fileName;
        var isDirectory;
        
            fileName = files[x].leafName;
            isDirectory = files[x].isDirectory();
       

        if (gSearchRegExp) {
          if (fileName.search(regEx) != -1) {
            searchFiles.push(files[x]);
          }
        } else {
          if (allMinus) {
            searchFiles.push(files[x]);
          }

          for (var y = 0; y < gSearchName.length; ++y) {
            var searchTerm = gSearchName[y].charAt(0) == '+' ? gSearchName[y].substring(1) : gSearchName[y];
            if ((!gSearchMatchCase && fileName.toLowerCase().indexOf(searchTerm.toLowerCase()) != -1)
              || (gSearchMatchCase && fileName.indexOf(searchTerm) != -1)) {
              searchFiles.push(files[x]);
              break;
            }
          }
        }
      }
  
  if (!gSearchRegExp) {                                                                 // look at + and - criteria
    for (var x = 0; x < gSearchName.length; ++x) {
      var ch = gSearchName[x].charAt(0);

      if (ch != '+' && ch != '-') {
        continue;
      }

      for (var y = searchFiles.length - 1; y >= 0; --y) {
          var fileNameLocal;
          if (gSearchType){
              fileNameLocal = searchFiles[y].name;
          }
          else{
             fileNameLocal = searchFiles[y].leafName;
          }

        
        if (!gSearchMatchCase && ((ch == '-' && fileNameLocal.toLowerCase().indexOf(gSearchName[x].substring(1).toLowerCase()) != -1)
                               || (ch == '+' && fileNameLocal.toLowerCase().indexOf(gSearchName[x].substring(1).toLowerCase()) == -1))) {
          searchFiles.splice(y, 1);
        } else if (gSearchMatchCase && ((ch == '-' && fileNameLocal.indexOf(gSearchName[x].substring(1)) != -1)
                                     || (ch == '+' && fileNameLocal.indexOf(gSearchName[x].substring(1)) == -1))) {
          searchFiles.splice(y, 1);
        }
      }
    }
  }

  if (gSearchDates) {                                                                   // look at dates
    for (var x = searchFiles.length - 1; x >= 0; --x) {
        var fileDate;
        if (gSearchType){
            fileDate = searchFiles[x].modificationDate;
        }
        else{
            fileDate = searchFiles[x].lastModifiedTime;
        }
        if (fileDate < gSearchFrom || fileDate - 86400000 > gSearchTo || (gSearchType && searchFiles[x].isFolder)) {
            searchFiles.splice(x, 1);
        }
    }
  }

  if (searchFiles.length) {                                                             // update the view with the new results
    gSearchFound = true;
    
      localTree.updateView(searchFiles);
    
  }

    gSearchRunning = false;
  --gProcessing;
  $('searchFile').disabled = false;
  $('searchFile').focus();
  $('searchButton').label = gStrbundle.getString("search");

    if (gSearchRecursive){
        for (var x = 0; x < files.length; ++x) {
            var isDirectory;
                isDirectory = files[x].isDirectory();
            if (isDirectory){
                //searchInFiles(files[x]);
                arguments.callee(files[x]);
            }
        }
    }

  if (!gSearchFound) {
    $('searchFile').setAttribute("status",       "notfound");
    $('searchStatusIcon').setAttribute("status", "notfound");
    $('searchStatus').value = gStrbundle.getString("notFound");
    return;
  }
}




function makeSearchCallback(file, last) {
  var func = function() {
    search(file.path, last);
  };

  if (gSearchType) {
    //gFtp.list(file.path, func, true, true);
    gSearchCallbacks.unshift(func);
  } else {
    gSearchCallbacks.unshift(func);
  }
}

function finalSearchCallback() {                                                        // close up shop
  gSearchRunning = false;
  --gProcessing;
  $('searchFile').disabled = false;
  $('searchFile').focus();
  $('searchButton').label = gStrbundle.getString("search");

  if (!gSearchFound) {
    $('searchFile').setAttribute("status",       "notfound");
    $('searchStatusIcon').setAttribute("status", "notfound");
    $('searchStatus').value = gStrbundle.getString("notFound");
    return;
  }
}

function removeBlanks(element, index, array) {
  return element;
}

function trim(str) {
  return str.replace(/^\s*/, "").replace(/\s*$/, "");
}
