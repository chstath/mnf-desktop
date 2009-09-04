var remoteTree = {
  data                    : new Array(),
  displayData             : new Array(),
  rowCount                : 0,
  remoteSize               : 0,
  remoteAvailableDiskSpace : 0,
  searchMode              : 0,
  isEditing               : false,
  editType                : "",
  editParent              : null,
  rememberSort            : null,

  getParentIndex      : function(row)               { return -1; },
  getLevel            : function(row)               { return 0;  },
  getRowProperties    : function(row, props)        { },
  getColumnProperties : function(colid, col, props) { },
  isContainer         : function(row)               { return false; },
  isSeparator         : function(row)               { return false; },
  isSorted            : function(row)               { return false; },
  setTree             : function(treebox)           { this.treebox = treebox; },

  getCellText         : function(row, column)       {                                           // text for the files
    if (row >= 0 && row < this.data.length) {
      switch(column.id) {
        case "remotename":
          return this.searchMode == 2 ? this.displayData[row].path : this.displayData[row].leafName;
        case "remotesize":
          return this.displayData[row].fileSize;
        case "remotedate":
          return this.displayData[row].date;
        case "remotetype":
          return this.displayData[row].extension;
        case "remoteattr":
          return this.displayData[row].attr;
        default:
          return " ";
      }
    }

    return "";
  },

  getImageSrc  : function(row, col)  {
    return row >= 0 && row < this.data.length && col.id == "remotename" && this.displayData[row].icon ? this.displayData[row].icon : "";
  },

  cycleHeader : function(col) {
    var sortDirection = col.element.getAttribute("sortDirection") == "ascending"
                     || col.element.getAttribute("sortDirection") == "natural"  ? "descending" : "ascending";
    $('remotename').setAttribute("sortDirection", "natural");
    $('remotesize').setAttribute("sortDirection", "natural");
    $('remotedate').setAttribute("sortDirection", "natural");
    $('remotetype').setAttribute("sortDirection", "natural");
    $('remoteattr').setAttribute("sortDirection", "natural");
    col.element.setAttribute(   "sortDirection", sortDirection);
    this.sort();
  },

  getCellProperties : function(row, col, props)   {
    if (row >= 0 && row < remoteTree.data.length && remoteTree.data[row]) {
      if (col.id == "remotename") {
        if (remoteTree.displayData[row].isDirectory) {
          props.AppendElement(gAtomService.getAtom("isFolder"));
        } else if (remoteTree.displayData[row].isSymlink) {
          props.AppendElement(gAtomService.getAtom("isLink"));
        }

        props.AppendElement(gAtomService.getAtom("nameCol"));
      }

      if (dragObserver.overName) {
        props.AppendElement(gAtomService.getAtom("overName"));
      }

      if (remoteTree.displayData[row].isHidden) {
        props.AppendElement(gAtomService.getAtom("hidden"));
      }

      if (remoteTree.displayData[row].isCut) {
        props.AppendElement(gAtomService.getAtom("cut"));
      }
    }
  },

  // ****************************************************** updateView ***************************************************

  updateView : function(files) {
    remoteDirTree.select();
  },

  sort : function(files) {
    if (!files) {
      if (this.rememberSort) {
        for (var x = 0; x < this.rememberSort.cols.length; ++x) {
          $(this.rememberSort.cols[x]).setAttribute("sortDirection", this.rememberSort.vals[x]);
        }

        this.rememberSort = null;
      }

//      this.sortHelper($('remotename'), this.searchMode == 2 ? directorySort2 : compareName);
//      this.sortHelper($('remotesize'), compareSize);
//      this.sortHelper($('remotedate'), compareDate);
//      this.sortHelper($('remotetype'), compareType);
//      this.sortHelper($('remoteattr'), compareLocalAttr);

      this.displayData = new Array();
    } else {
      $('remotename').setAttribute("sortDirection", "natural");
      $('remotesize').setAttribute("sortDirection", "natural");
      $('remotedate').setAttribute("sortDirection", "natural");
      $('remotetype').setAttribute("sortDirection", "natural");
      $('remoteattr').setAttribute("sortDirection", "natural");
    }

    var start = files ? this.data.length - files.length : 0;

    for (var row = start; row < this.data.length; ++row) {
      this.displayData.push({ leafName    : this.data[row].name,
                              fileSize    : "0",
                              date        : "1/1/2000",
                              extension   : this.data[row].isFolder ? "" : "txt",//this.getExtension(this.data[row].leafName),
                              attr        : "",
                              icon        : this.getFileIcon(row),
                              path        : this.data[row].location,
                              isDirectory : this.data[row].isFolder,
                              isSymlink   : false,
                              isHidden    : false });
    }

    if (files) {
      this.rowCount = this.data.length;
      this.treebox.rowCountChanged(start, files.length);
    } else {
      this.treebox.rowCountChanged(0, -this.rowCount);
      this.rowCount = this.data.length;
      this.treebox.rowCountChanged(0, this.rowCount);
    }
  },

  sortHelper : function(el, sortFunc) {
    if (el.getAttribute("sortDirection") && el.getAttribute("sortDirection") != "natural") {
      this.data.sort(sortFunc);

      if (el.getAttribute("sortDirection") == "ascending") {
        this.data.reverse();
      }
    }
  },

  getFormattedFileSize : function(row) {
    if (this.data[row].isDirectory()) {
      return "";
    }

    if (this.data[row].fileSize == 0) {
      return gBytesMode ? "0  " : gStrbundle.getFormattedString("kilobyte", ["0"]) + "  ";
    }

    if (gBytesMode) {
      return commas(this.data[row].fileSize) + "  ";
    }

    return gStrbundle.getFormattedString("kilobyte", [commas(Math.ceil(this.data[row].fileSize / 1024))]) + "  ";
  },

  getFormattedDate : function(row) {
    var date = new Date(this.data[row].lastModifiedTime);

    if ((new Date()).getFullYear() > date.getFullYear()) {                                      // if not current year, display old year
      return gMonths[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear();
    }

    var time = date.toLocaleTimeString();                                                       // else display time
    var ampm = time.indexOf('AM') != - 1 ? ' AM' : (time.indexOf('PM') != -1 ? ' PM' : '');
    return gMonths[date.getMonth()] + ' ' + date.getDate() + ' ' + time.substring(0, time.lastIndexOf(':')) + ampm;
  },

  getExtension : function(leafName) {
    return leafName.lastIndexOf(".") != -1 ? leafName.substring(leafName.lastIndexOf(".") + 1, leafName.length).toLowerCase() : "";
  },

  convertPermissions : function(hidden, permissions) {
    if (gSlash == "\\") {                                                                       // msdos
      var returnString = "";

      if (permissions == 438) {                                                                 // Normal file  (666 in octal)
        returnString = gStrbundle.getString("normalFile");
      } else if (permissions == 511) {                                                          // Executable file (777 in octal)
        returnString = gStrbundle.getString("executableFile");
      } else if (permissions == 292) {                                                          // Read-only (444 in octal)
        returnString = gStrbundle.getString("readOnlyFile");
      } else if (permissions == 365) {                                                          // Read-only and executable (555 in octal)
        returnString = gStrbundle.getString("readOnlyExecutableFile");
      } else {
        returnString = " ";
      }

      if (hidden) {
        returnString += gStrbundle.getString("hiddenFile");
      }

      return returnString;
    } else {
      permissions           = permissions.toString(8);

      if (gPlatform == 'mac') {
        permissions         = permissions.substring(permissions.length - 4);
      }

      permissions           = parseInt(permissions, 8);
      var binary            = permissions.toString(2);
      var permissionsString = "";

      for (var x = 0; x < 9; x += 3) {
        permissionsString += binary.charAt(0 + x) == "1" ? "r" : "-";
        permissionsString += binary.charAt(1 + x) == "1" ? "w" : "-";
        permissionsString += binary.charAt(2 + x) == "1" ? "x" : "-";
      }

      return permissionsString;
    }
  },

  getFileIcon : function(row) {
    var icon, name, ext, file;
    if (this.data[row].isFolder) {
      return "";
    }

    file = remoteTree.data[row];
    name = file.name;
    ext = name.substring(name.lastIndexOf('.') + 1);
    if (ext !== '')
        icon = "moz-icon://."+ext+"?size=16";
    else
        icon = "moz-icon://"+name+"?size=16&contentType="+file.content;
    return icon;
  },

  // ************************************************** refresh *******************************************************

  refresh : function(skipLocalTree, skipDelay) {
    if (remoteDirTree.data[remoteDirTree.selection.currentIndex].open) {                          // if remoteDirTree is open
      remoteDirTree.toggleOpenState(remoteDirTree.selection.currentIndex);                        // close it up
      remoteDirTree.data[remoteDirTree.selection.currentIndex].children = null;                   // reset its children
      remoteDirTree.toggleOpenState(remoteDirTree.selection.currentIndex);                        // and open it up again
    } else {
      remoteDirTree.data[remoteDirTree.selection.currentIndex].empty    = false;                  // not empty anymore
      remoteDirTree.data[remoteDirTree.selection.currentIndex].children = null;                   // reset its children
      remoteDirTree.treebox.invalidateRow(remoteDirTree.selection.currentIndex);
    }

    if (!skipLocalTree) {
      if (skipDelay) {
        this.updateView();
      } else {
        setTimeout("remoteTree.updateView()", 1000);                                             // update remoteTree, after a little bit
      }
    }
  },

  // ****************************************************** file functions ***************************************************

  constructPath : function(parent, leafName) {
    return parent + (parent.charAt(parent.length - 1) != gSlash ? gSlash : '') + leafName;
  },

  launch : function() {
    if (this.selection.count == 0) {
      return;
    }

    for (var x = 0; x < this.rowCount; ++x) {
      if (this.selection.isSelected(x)) {
        if (!localFile.verifyExists(this.data[x])) {
          continue;
        }

        localFile.launch(this.data[x]);
      }
    }
  },

  openContainingFolder : function() {
    if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount || !localFile.verifyExists(this.data[this.selection.currentIndex].parent)) {
      return;
    }

    remoteDirTree.changeDir(this.data[this.selection.currentIndex].parent.path);
  },

  extract : function(toFolder) {
    if (this.selection.count == 0) {
      return;
    }

    var files = new Array();

    for (var x = 0; x < this.rowCount; ++x) {
      if (this.selection.isSelected(x)) {
        if (!localFile.verifyExists(this.data[x])) {
          continue;
        }

        files.push(this.data[x]);
      }
    }

    for (var x = 0; x < files.length; ++x) {
      var extension = this.getExtension(files[x].leafName);
      if (extension != "zip" && extension != "jar" && extension != "xpi") {
        continue;
      }

      this.extractHelper(toFolder, files[x]);
    }
  },

  create : function(isDir) {
    if (this.searchMode == 2) {
      return;
    }

    this.data.push({        leafName    : "",
                            fileSize    : "",
                            date        : "",
                            extension   : "",
                            attr        : "",
                            path        : "",
                            isDir       : isDir,
                            isDirectory : function() { return this.isDir },
                            isSymlink   : function() { return false },
                            isHidden    : false });
    this.displayData.push({ leafName    : "",
                            fileSize    : "",
                            date        : "",
                            extension   : "",
                            attr        : "",
                            icon        : isDir ? "" : "moz-icon://file?size=16",
                            path        : "",
                            isDirectory : isDir,
                            isSymlink   : false,
                            isHidden    : false });
    ++this.rowCount;
    this.treebox.rowCountChanged(this.rowCount - 1, 1);
    this.treebox.ensureRowIsVisible(this.rowCount - 1);

    this.editType   = "create";
    this.editParent = gRemotePath.value;
    setTimeout("gLocalTree.startEditing(remoteTree.rowCount - 1, gLocalTree.columns['remotename'])", 0);
  },

  remove : function() {
    var origParent;
    if (this.selection.count == 0) {
      return;
    }

    var count = this.selection.count;
    var files = new Array();

    for (var x = 0; x < this.rowCount; ++x) {
      if (this.selection.isSelected(x)) {
        origParent = this.data[x].parent;
        files.push(this.data[x]);
      }
    }

    var prompt = true;

    for (var x = 0; x < files.length; ++x) {
      if (!remoteFile.remove(files[x], prompt, count)) {
        break;
      }

      prompt = false;
    }
  },

  rename : function() {
    if (this.rowCount > 0 && this.selection.count > 0) {
      if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
        this.selection.currentIndex = this.rowCount - 1;
      }

      if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
        return;
      }

      this.displayData[this.selection.currentIndex].origLeafName = this.data[this.selection.currentIndex].leafName;
      this.displayData[this.selection.currentIndex].origPath     = this.data[this.selection.currentIndex].path;

      if (this.searchMode == 2) {
        this.displayData[this.selection.currentIndex].path = this.displayData[this.selection.currentIndex].leafName;
        this.treebox.invalidateRow(this.selection.currentIndex);
      }

      this.editType   = "rename";
      this.editParent = gRemotePath.value;
      gLocalTree.startEditing(this.selection.currentIndex, gLocalTree.columns["remotename"]);
    }
  },

  isEditable : function(row, col) {
    var canEdit = row >= 0 && row < this.data.length && col.id == "remotename";
    this.isEditing = canEdit;
    return canEdit;
  },

  setCellText : function(row, col, val) {
    if (!this.isEditing || this.editParent != gRemotePath.value) {                               // for some reason, this is called twice - so we prevent this
      return;
    }

    this.isEditing = false;
    if (this.editType == "rename") {
      if (this.data[row].leafName == val) {
        // do nothing
      } else if (localFile.rename(this.data[row], val)) {
        var rowDiff = this.treebox.getLastVisibleRow() - row;

        this.refresh(false, true);

        for (var x = 0; x < this.rowCount; ++x) {
          if (this.data[x].leafName == val) {
            this.selection.select(x);
            this.treebox.ensureRowIsVisible(rowDiff + x - 1 < this.rowCount ? rowDiff + x - 1 : this.rowCount - 1);
            break;
          }
        }
      } else {
        this.displayData[row].leafName = val;
        this.treebox.invalidateRow(row);
        setTimeout("gLocalTree.startEditing(" + row + ", gLocalTree.columns['remotename'])", 0);
      }
    } else if (this.editType == "create") {
      if (val) {
        if (localFile.create(this.data[row].isDir, val)) {
          this.refresh(false, true);

          for (var x = 0; x < this.rowCount; ++x) {
            if (this.data[x].leafName == val) {
              this.selection.select(x);
              this.treebox.ensureRowIsVisible(x);
              break;
            }
          }
        } else {
          this.data[row].leafName        = val;
          this.displayData[row].leafName = val;
          this.treebox.invalidateRow(row);
          setTimeout("gLocalTree.startEditing(remoteTree.rowCount - 1, gLocalTree.columns['remotename'])", 0);
        }
      } else {
        --this.rowCount;
        this.data.splice(this.rowCount, 1);
        this.displayData.splice(this.rowCount, 1);
        this.treebox.rowCountChanged(this.rowCount, -1);
      }
    }
  },

  showProperties : function(recursive) {
    if (this.rowCount == 0 || this.selection.count == 0) {
      return;
    }

    if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
      this.selection.currentIndex = this.rowCount - 1;
    }

    if (this.selection.count > 1) {                                                             // multiple files
      var files = new Array();

      for (var x = 0; x < this.rowCount; ++x) {
        if (this.selection.isSelected(x)) {
          if (!localFile.verifyExists(this.data[x])) {
            continue;
          }

          files.push(this.data[x]);
        }
      }

      var recursiveFolderData = { type: "local", nFolders: 0, nFiles: 0, nSize: 0 };

      for (var x = 0; x < files.length; ++x) {
        if (!localFile.verifyExists(files[x])) {
          continue;
        }

        if (files[x].isDirectory()) {
          ++recursiveFolderData.nFolders;

          if (recursive) {
            this.getRecursiveFolderData(files[x], recursiveFolderData);
          }
        } else {
          ++recursiveFolderData.nFiles;
        }

        recursiveFolderData.nSize += files[x].fileSize;
      }

      var params = { multipleFiles       : true,
                     recursiveFolderData : recursiveFolderData };

      window.openDialog("chrome://firegss/content/properties.xul", "properties", "chrome,modal,dialog,resizable,centerscreen", params);

      return;
    }

    if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
      return;
    }

    var origParent = gRemotePath.value;                                                          // since were doing threading, the parent path could change

    if (localFile.showProperties(this.data[this.selection.currentIndex], recursive)) {
      if (origParent == gRemotePath.value) {                                                     // since we're working on a separate thread make sure we're in the same directory on refresh
        var single  = this.selection.count == 1 ? this.selection.currentIndex : -1;
        var name    = this.data[this.selection.currentIndex].leafName;
        var rowDiff = this.treebox.getLastVisibleRow() - single;

        this.refresh(false, true);

        if (single != -1) {
          for (var x = 0; x < this.rowCount; ++x) {
            if (this.data[x].leafName == name) {
              this.selection.select(x);
              this.treebox.ensureRowIsVisible(rowDiff + x - 1 < this.rowCount ? rowDiff + x - 1 : this.rowCount - 1);
              break;
            }
          }
        }
      }
    }
  },

  getRecursiveFolderData : function(dir, recursiveFolderData) {
    ++gProcessing;
    gfiregssUtils.getRecursiveFolderData(dir, new wrapperClass(recursiveFolderData));
    --gProcessing;
  },

	// ************************************************* mouseEvent *****************************************************


  click : function(event) {
    if (event.button == 1 && !$('localPasteContext').disabled) {                                // middle-click paste
      this.paste();
    }
  },

	createContextMenu : function() {
    if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
      this.selection.currentIndex = this.rowCount - 1;
    }

    $('remoteCutContext').setAttribute("disabled",   this.searchMode == 2 || !gFtp.isConnected);
    $('remotePasteContext').setAttribute("disabled", this.searchMode == 2 || !gFtp.isConnected || !this.pasteFiles.length);
    $('remoteCreateDir').setAttribute("disabled",    this.searchMode == 2 || !gFtp.isConnected);
    $('remoteCreateFile').setAttribute("disabled",   this.searchMode == 2 || !gFtp.isConnected);

    if (this.selection.currentIndex == -1) {
      return;
    }

    var hasDir = false;
    for (var x = 0; x < this.rowCount; ++x) {
      if (this.selection.isSelected(x)) {
        if (this.data[x].isFolder) {
          hasDir = true;
          break;
        }
      }
    }

  },

  mouseOver : function(event) {                                                                 // display remote folder info
    if (this.rowCount) {
      $('statustxt').label = gStrbundle.getString("localListing") + " " + gStrbundle.getFormattedString("objects", [this.rowCount])
                           + (this.remoteSize < 0 ? "" : ", " + commas(this.remoteSize)) + ", "
                           + gStrbundle.getString("diskSpace")    + " " + this.remoteAvailableDiskSpace;
    } else {
      $('statustxt').label = gStrbundle.getString("localListingNoObjects");
    }
  },

  // ************************************************* keyEvent *****************************************************

  keyPress : function(event) {
    if (gLocalTree.editingRow != -1) {
      if (event.keyCode == 27) {
        if (this.editType == "create") {
          this.setCellText(-1, "", "");
        } else {
          this.displayData[gLocalTree.editingRow].leafName = this.displayData[gLocalTree.editingRow].origLeafName;
          this.displayData[gLocalTree.editingRow].path     = this.displayData[gLocalTree.editingRow].origPath;
          this.treebox.invalidateRow(gLocalTree.editingRow);
        }
      }

      return;
    }

    if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
      this.selection.currentIndex = this.rowCount - 1;
    }

    if (event.keyCode == 13 && this.selection.count != 0) {                                     // enter
      if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
        return;
      }

      if (this.selection.count == 1 && this.data[this.selection.currentIndex].isDirectory()) {  // if it's a directory
        remoteDirTree.changeDir(this.data[this.selection.currentIndex].path);                    // navigate to it
      } else {
        if (gOpenMode) {
          this.launch();
        } else {
          new transfer().start(false);                                                          // else upload a file
        }
      }
    } else if (event.ctrlKey && (event.which == 65 || event.which == 97)) {
      event.preventDefault();                                                                   // ctrl-a: select all
      this.selection.selectAll();
    } else if (event.ctrlKey && event.keyCode == 32 && this.selection.count != 0) {             // ctrl-space, select or deselect
      this.selection.toggleSelect(this.selection.currentIndex);
    } else if (event.keyCode  == 8) {                                                           // backspace
      event.preventDefault();
      remoteDirTree.cdup();
    } else if (event.keyCode  == 116) {                                                         // F5
      event.preventDefault();
      this.refresh(false, true);
    } else if (event.keyCode  == 113 && this.selection.count != 0) {                            // F2
      this.rename();
    } else if (event.charCode == 100 && event.ctrlKey) {                                        // ctrl-d
      event.preventDefault();
      this.create(true);
    } else if (event.charCode == 110 && event.ctrlKey) {                                        // ctrl-n
      event.preventDefault();
      this.create(false);
    } else if (event.keyCode  == 46 && this.selection.count != 0) {                             // del
      this.remove();
    } else if (event.keyCode  == 93) {                                                          // display context menu
      var x = {};    var y = {};    var width = {};    var height = {};
      this.treebox.getCoordsForCellItem(this.selection.currentIndex, this.treebox.columns["remotename"], "text", x, y, width, height);
      this.createContextMenu();
      $('remotemenu').showPopup(gLocalTreeChildren, gLocalTreeChildren.boxObject.x + 75, gLocalTreeChildren.boxObject.y + y.value + 5, "context");
    } else if (event.charCode == 112 && event.ctrlKey && this.selection.count != 0) {           // ctrl-p
      event.preventDefault();
      this.showProperties(false);
    } else if (event.charCode == 120 && event.ctrlKey && this.selection.count != 0) {           // ctrl-x
      event.preventDefault();
      this.cut();
    } else if (event.charCode == 99 &&  event.ctrlKey && this.selection.count != 0) {           // ctrl-c
      event.preventDefault();
      this.copy();
    } else if (event.charCode == 118 && event.ctrlKey) {                                        // ctrl-v
      event.preventDefault();
      this.paste();
    } else if (event.charCode == 111 && event.ctrlKey) {                                        // ctrl-o
      event.preventDefault();
      this.launch();
    }
  },

  // ************************************************* cut, copy, paste *****************************************************

  isCut      : false,
  pasteFiles : new Array(),
  oldParent  : "",

  cut  : function() {
    this.copy(true);
  },

  copy : function(isCut) {
    if (this.searchMode == 2) {
      return;
    }

    if (this.selection.count == 0) {
      return;
    }

    this.isCut      = isCut;
    this.pasteFiles = new Array();
    this.oldParent  = gRemotePath.value;

    for (var x = 0; x < this.rowCount; ++x) {                                                   // put files to be cut/copied in an array to be pasted
      if (this.selection.isSelected(x)) {
        if (localFile.verifyExists(this.data[x])) {
          this.pasteFiles.push(this.data[x]);
          this.displayData[x].isCut = isCut;
          this.treebox.invalidateRow(x);
        }
      }
    }

    $('localPasteContext').setAttribute("disabled", false);                                     // enable pasting
  },

  paste : function(dest) {
    if (this.searchMode == 2) {
      return;
    }

    if (this.pasteFiles.length == 0) {
      return;
    }

    var zeFiles = new Array();
    for (var x = 0; x < this.pasteFiles.length; ++x) {
      zeFiles.push(this.pasteFiles[x]);
    }

    var newParent = dest ? dest : gRemotePath.value;

    if (!localFile.verifyExists(zeFiles[0])) {
      return;
    }

    for (var x = 0; x < zeFiles.length; ++x) {
      var newParentSlash = newParent       + (newParent.charAt(newParent.length - 1)             != gSlash ? gSlash : '');
      var pasteFileSlash = zeFiles[x].path + (zeFiles[x].path.charAt(zeFiles[x].path.length - 1) != gSlash ? gSlash : '');

      if (zeFiles[x].isDirectory() && newParentSlash.indexOf(pasteFileSlash) == 0) {    // can't copy into a subdirectory of itself
        doAlert(gStrbundle.getString("copySubdirectory"));
        return;
      }
    }

    var prompt     = true;
    var skipAll    = false;
    var anyFolders = false;
    ++gProcessing;

    try {
      var newDir = localFile.init(newParent);

      for (var x = 0; x < zeFiles.length; ++x) {
        if (!localFile.verifyExists(zeFiles[x])) {
          continue;
        }

        if (zeFiles[x].isDirectory()) {
          anyFolders = true;
        }

        var newFile = localFile.init(this.constructPath(newDir.path, zeFiles[x].leafName));

        if (newFile.exists() && skipAll) {
          continue;
        }

        if (newFile.exists() && (newFile.isDirectory() || zeFiles[x].isDirectory())) {
          error(gStrbundle.getFormattedString("pasteErrorFile", [zeFiles[x].path]));
          continue;
        }

        if (newFile.exists() && prompt) {                                                       // ask nicely
          var params = { response         : 0,
                         fileName         : newFile.path,
                         resume           : true,
                         replaceResume    : true,
                         existingSize     : newFile.fileSize,
                         existingDate     : newFile.lastModifiedTime,
                         newSize          : zeFiles[x].fileSize,
                         newDate          : zeFiles[x].lastModifiedTime,
                         timerEnable      : false };

          window.openDialog("chrome://firegss/content/confirmFile.xul", "confirmFile", "chrome,modal,dialog,resizable,centerscreen", params);

          if (params.response == 2) {
            prompt = false;
          } else if (params.response == 3) {
            continue;
          } else if (params.response == 4 || params.response == 0) {
            --gProcessing;
            return;
          } else if (params.response == 5) {
            skipAll = true;
            continue;
          }
        }

        var innerEx = gfiregssUtils.cutCopy(this.isCut, zeFiles[x], newFile, newDir, null);

        if (innerEx) {
          throw innerEx;
        }
      }
    } catch (ex) {
      debug(ex);
      error(gStrbundle.getString("pasteError"));
    } finally {
      --gProcessing;
    }

    var currentDir = dest ? this.oldParent : newParent;

    if (this.isCut && anyFolders) {
      var refreshIndex = dest ? remoteDirTree.indexOfPath(newParent) : remoteDirTree.indexOfPath(this.oldParent);

      if (refreshIndex != -1) {
        if (remoteDirTree.data[refreshIndex].open) {
          remoteDirTree.toggleOpenState(refreshIndex, true);                                     // close it up
          remoteDirTree.data[refreshIndex].children = null;                                      // reset its children
          remoteDirTree.toggleOpenState(refreshIndex);                                           // and open it up again
        } else {
          remoteDirTree.data[refreshIndex].children = null;                                      // reset its children
          remoteDirTree.data[refreshIndex].empty    = false;
          remoteDirTree.treebox.invalidateRow(refreshIndex);
        }

        if (currentDir == gRemotePath.value) {
          var refreshIndex2 = remoteDirTree.indexOfPath(currentDir);

          if (refreshIndex2 == -1) {
            remoteDirTree.changeDir(currentDir);
          } else {
            remoteDirTree.selection.select(refreshIndex2);
          }
        }
      } else {
        remoteDirTree.addDirtyList(dest ? newParent : this.oldParent);
      }
    }

    if (this.isCut) {
      this.pasteFiles  = new Array();
      this.isCut       = false;
      $('localPasteContext').setAttribute("disabled", true);
    }

    if (currentDir == gRemotePath.value) {                                                       // since we're working on a separate thread make sure we're in the same directory on refresh
      this.refresh();
    } else {
      var path = gRemotePath.value;
      var refreshIndex = remoteDirTree.indexOfPath(currentDir);

      if (refreshIndex != -1) {
        if (remoteDirTree.data[refreshIndex].open) {
          remoteDirTree.toggleOpenState(refreshIndex, true);                                     // close it up
          remoteDirTree.data[refreshIndex].children = null;                                      // reset its children
          remoteDirTree.toggleOpenState(refreshIndex);                                           // and open it up again
        } else {
          remoteDirTree.data[refreshIndex].children = null;                                      // reset its children
          remoteDirTree.data[refreshIndex].empty    = false;
          remoteDirTree.treebox.invalidateRow(refreshIndex);
        }

        var refreshIndex2 = remoteDirTree.indexOfPath(path);

        if (refreshIndex2 == -1) {
          remoteDirTree.changeDir(path);
        } else {
          remoteDirTree.selection.select(refreshIndex2);
        }
      } else {
        remoteDirTree.addDirtyList(currentDir);
      }
    }
  },

  canDrop : function(index, orient) {
    if (index == -1 || !this.data[index].isDirectory() || !dragObserver.origin || dragObserver.origin == "external") {
      return false;
    }

    if (dragObserver.origin == 'localtreechildren') {                                           // don't drag onto itself
      for (var x = 0; x < this.rowCount; ++x) {
        if (this.selection.isSelected(x) && index == x) {
          return false;
        }
      }
    }

    if (dragObserver.origin.indexOf('remote') != -1 && !gFtp.isConnected) {
      return false;
    }

    return true;
  },

  drop : function(index, orient) {
    if (dragObserver.origin == 'localtreechildren') {
      this.cut();
      this.paste(this.data[index].path);
    } else if (dragObserver.origin == 'remotetreechildren') {
      if (!dragObserver.overName || index == -1 || !this.data[index].isDirectory()) {
        new transfer().start(true);
      } else {
        var transferObj          = new transfer();
        transferObj.localRefresh = gRemotePath.value;
        transferObj.start(true,  '', this.data[index].path, '');
      }
    }
  },

  showFolderContents: function(folder) {
      remoteTree.treebox.rowCountChanged(0, -remoteTree.rowCount);
      //folder = remoteDirTree.data[remoteDirTree.selection.currentIndex].gssObj;
      if (folder.folders) {
          remoteTree.data = folder.folders.concat(folder.files);
          remoteTree.displayData = [];
          for (var row = 0; row < remoteTree.data.length; row++) {
              if (remoteTree.data[row].modificationDate) {
                  var fileDate = new Date();
                  fileDate.setTime(remoteTree.data[row].modificationDate);
              }
              else
                  fileDate = "";
              remoteTree.displayData.push({ leafName    : remoteTree.data[row].name,
                                              fileSize    : remoteTree.data[row].size,
                                              date        : fileDate.toLocaleString(),
                                              extension   : remoteTree.data[row].content,
                                              attr        : "",
                                              icon        : remoteTree.getFileIcon(row),
                                              path        : remoteTree.data[row].uri,
                                              isDirectory : remoteTree.data[row].isFolder,
                                              isSymlink   : false,
                                              isHidden    : false
                                          });
          }
      }
      else {
          remoteTree.data = [];
          remoteTree.displayData = [];
      }
      remoteTree.rowCount = remoteTree.data.length;
      remoteTree.treebox.rowCountChanged(0, remoteTree.rowCount);
  },

  dblClick : function(event) {
      if (event.button != 0 || event.originalTarget.localName != "treechildren" || this.selection.count == 0) {
          return;
      }

      if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
          this.selection.currentIndex = this.rowCount - 1;
      }

      var index = this.selection.currentIndex;
      if (this.data[index].isFolder) {                                 // if it's a directory
          var folder = this.data[index]; //cache the folder 'cause this.data may be cleared after showFolderContents

          var parentIndex = remoteDirTree.selection.currentIndex;
          if (!remoteDirTree.isContainerOpen(parentIndex))
              remoteDirTree.toggleOpenState(parentIndex);
          var thisIndex = remoteDirTree.indexOfFolder(folder)
          remoteDirTree.selection.select(thisIndex);
      }
      else {
          var file = this.data[index];
          var uri = file.uri;
          var now = (new Date()).toUTCString();
          var resource = uri;
          if (resource.indexOf(gss.API_URL) == 0)
              resource = resource.slice(gss.API_URL.length, resource.length);
          var auth = gss.getAuth("GET", uri);
          window.open(uri + "?" + auth.authString);
      }
  },
  
  copyUrl: function () {
    if (this.selection.count == 0) {
      return;
    }

    if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
      this.selection.currentIndex = this.rowCount - 1;
    }

    var paths = "";

    for (var x = 0; x < remoteTree.rowCount; ++x) {
      if (remoteTree.selection.isSelected(x)) {
        var path = this.data[x].uri;
        paths += (paths ? '\n' : '') + path;
      }
    }


    var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].createInstance(Components.interfaces.nsIClipboardHelper);
    clipboard.copyString(paths);
 
  }
};
