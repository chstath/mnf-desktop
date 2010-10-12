var remoteTree = {
    data                    : new Array(),
    displayData             : new Array(),
    rowCount                : 0,
    remoteSize              : 0,
    remoteAvailableDiskSpace : 0,
    searchMode              : 0,
    isEditing               : false,
    editType                : "",
    editParent              : null,
    rememberSort            : null,
    currentFolder           : null,

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
                    return this.getFileName(row);
                case "remotesize":
                    return this.getFormattedFileSize(row);
                case "remotedate":
                    return this.getFormattedDate(row);
                case "remotetype":
                    return this.displayData[row].extension;
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

    updateView : function() {
        remoteTree.updateStats();
        remoteDirTree.select();
        if (this.searchMode){
            this.searchMode = 0;
            gRemoteTreeChildren.removeAttribute('search');
        }
    },

    updateView2 : function(files) {
        this.data        = new Array();
        this.displayData = new Array();

        if (this.remoteSize != -1) {
            this.treebox.rowCountChanged(0, -this.rowCount);

            this.rememberSort = { cols : ["remotename", "remotesize", "remotedate", "remotetype"],
                vals : [$('remotename').getAttribute("sortDirection"),
                    $('remotesize').getAttribute("sortDirection"),
                    $('remotedate').getAttribute("sortDirection"),
                    $('remotetype').getAttribute("sortDirection")] };
        }

        
        files.sort(compareNameRemote);

        for (var x = 0; x < files.length; ++x) {
            this.data.push(files[x]);
        }

        this.remoteSize  = -1;
        //this.searchMode = this.searchMode ? this.searchMode : (gSearchRecursive ? 2 : 1);
        this.searchMode = 1;
        gRemoteTreeChildren.setAttribute('search', true);
        this.sort(files);
        this.mouseOver(null);
    },

    sort : function(files) {
        if (!files) {
            if (this.rememberSort) {
                for (var x = 0; x < this.rememberSort.cols.length; ++x) {
                    $(this.rememberSort.cols[x]).setAttribute("sortDirection", this.rememberSort.vals[x]);
                }

                this.rememberSort = null;
            }

            this.sortHelper($('remotename'), this.searchMode == 2 ? directorySort2Remote : compareNameRemote);
            this.sortHelper($('remotesize'), compareSizeRemote);
            this.sortHelper($('remotedate'), compareDateRemote);
            this.sortHelper($('remotetype'), compareTypeRemote);

            this.displayData = new Array();
        } else {
            $('remotename').setAttribute("sortDirection", "natural");
            $('remotesize').setAttribute("sortDirection", "natural");
            $('remotedate').setAttribute("sortDirection", "natural");
            $('remotetype').setAttribute("sortDirection", "natural");
        }

        var start = files ? this.data.length - files.length : 0;

        for (var row = start; row < this.data.length; ++row) {
            this.displayData.push({ leafName    : this.data[row].name,
                fileSize    : this.getFormattedFileSize(row),
                date        : this.getFormattedDate(row),
                contentType : this.data[row].isFolder ? "" : this.getContentType(row),
                extension   : this.data[row].isFolder ? "" : this.getExtension(this.data[row].name),
                attr        : "",
                icon        : this.getFileIcon(row),
                path        : this.data[row].location ? this.data[row].location : this.data[row].uri,
                relativePath: this.data[row].path,
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

    getFileName : function(row){
        if (this.searchMode==1 || this.searchMode==2){
            if (this.displayData[row].relativePath){
                return this.displayData[row].relativePath + this.displayData[row].leafName;
            }
        }

        return this.displayData[row].leafName;
    },

    getFormattedFileSize : function(row) {
        if (this.data[row].isFolder) {
            return "";
        }

        if (this.data[row].size == 0) {
            return gBytesMode ? "0  " : gStrbundle.getFormattedString("kilobyte", ["0"]) + "  ";
        }

        if (gBytesMode) {
            return commas(this.data[row].size) + "  ";
        }

        return gStrbundle.getFormattedString("kilobyte", [commas(Math.ceil(this.data[row].size / 1024))]) + "  ";
    },

    getFormattedDate : function(row) {
        if (this.data[row].isFolder){
            return "";
        }

        var date;
        if (this.data[row].modificationDate){
          date = new Date(this.data[row].modificationDate);
        }
        else{
            date = new Date(this.data[row].creationDate);
        }

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

    getContentType : function(row){
        return this.data[row].content;
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

    refresh : function (skipLocalTree, skipDelay) {
        var index = remoteDirTree.selection.currentIndex;
        if (index < 0) {
            index = 0;
            appendLog("Zeroed negative remoteDirTree.selection.currentIndex.");
        }
        // if remoteDirTree is open
        if (remoteDirTree.data[index].open) {
            // close it up
            remoteDirTree.toggleOpenState(index);
            // reset its children
            remoteDirTree.data[index].children = null;
            // and open it up again
            remoteDirTree.toggleOpenState(index);
            remoteDirTree.selection.select(index);
        } else {
            // not empty anymore
            remoteDirTree.data[index].empty    = false;
            // reset its children
            remoteDirTree.data[index].children = null;
            remoteDirTree.treebox.invalidateRow(index);
        }

        if (!skipLocalTree) {
            if (skipDelay) {
                this.updateView();
            } else {
                // update remoteTree, after a little bit
                setTimeout(remoteTree.updateView, 1000);
            }
        }
    },

    // ****************************************************** file functions ***************************************************

    constructPath : function(parent, leafName) {
        return parent + (parent.charAt(parent.length - 1) != gSlash ? gSlash : '') + leafName;
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

    create : function() {
        if (this.searchMode == 2) {
            return;
        }

        this.data.push({        leafName    : "",
            fileSize    : "",
            date        : "",
            extension   : "",
            attr        : "",
            path        : "",
            isDir       : true,
            isDirectory : function() { return true },
            isSymlink   : function() { return false },
            isHidden    : false });
        this.displayData.push({ leafName    : "",
            fileSize    : "",
            date        : "",
            extension   : "",
            contentType : "",
            attr        : "",
            icon        : "",
            path        : "",
            isDirectory : true,
            isSymlink   : false,
            isHidden    : false });
        ++this.rowCount;
        this.treebox.rowCountChanged(this.rowCount - 1, 1);
        this.treebox.ensureRowIsVisible(this.rowCount - 1);

        this.editType   = "create";
        this.editParent = gRemotePath.value;
        setTimeout("gRemoteTree.startEditing(remoteTree.rowCount - 1, gRemoteTree.columns['remotename'])", 0);
    },

    remove : function() {
        if (this.selection.count == 0) {
            return;
        }

        var count = this.selection.count;
        var files = new Array();

        for (var x = 0; x < this.rowCount; ++x) {
            if (this.selection.isSelected(x)) {
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

            this.displayData[this.selection.currentIndex].origLeafName = this.data[this.selection.currentIndex].leafName;
            this.displayData[this.selection.currentIndex].origPath     = this.data[this.selection.currentIndex].path;

            if (this.searchMode == 2) {
                this.displayData[this.selection.currentIndex].path = this.displayData[this.selection.currentIndex].leafName;
                this.treebox.invalidateRow(this.selection.currentIndex);
            }

            this.editType   = "rename";
            this.editParent = gRemotePath.value;
            var selectionIndex = this.selection.currentIndex;
            gRemoteTree.startEditing(selectionIndex, gRemoteTree.columns["remotename"]);
        }
    },
    moveToTrash : function() {
        if (this.selection.count == 0) {
            return;
        }

        var count = this.selection.count;
        var files = new Array();

        for (var x = 0; x < this.rowCount; ++x) {
            if (this.selection.isSelected(x)) {
                files.push(this.data[x]);
            }
        }

        var prompt = true;

        for (var x = 0; x < files.length; ++x) {
            if (!remoteFile.moveToTrash(files[x], prompt, count)) {
                break;
            }

            prompt = false;
        }

    },
    restoreFromTrash : function() {
        if (this.selection.count == 0) {
            return;
        }

        var count = this.selection.count;
        var files = new Array();

        for (var x = 0; x < this.rowCount; ++x) {
            if (this.selection.isSelected(x)) {
                files.push(this.data[x]);
            }
        }

        var prompt = true;

        for (var x = 0; x < files.length; ++x) {
            if (!remoteFile.restoreFromTrash(files[x], prompt, count)) {
                break;
            }

            prompt = false;
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
            if (this.data[row].leafName != val) {
                var refreshList = function(){
                    remoteTree.updateView();
                    for (var x = 0; x < remoteTree.rowCount; ++x) {
                        if (remoteTree.data[x].name == val) {
                            remoteTree.selection.select(x);
                            remoteTree.treebox.ensureRowIsVisible(x);
                            break;
                        }
                    }
                }
                var changes = {name: val};
                gss.update(this.data[row], changes, refreshList);
            }
        } else if (this.editType == "create") {
            if (val) {
                //Do this so that that tha data[row] has the correct name. Otherwise the selection of the
                //newly created folder cannot be made
                remoteTree.data[row].name = val;
                var callback = function(newFolder) {
                    if (!newFolder) {
                        remoteTree.displayData[row].leafName = val;
                        remoteTree.treebox.invalidateRow(row);
                        setTimeout("gRemoteTree.startEditing(remoteTree.rowCount - 1, gRemoteTree.columns['remotename'])", 0);
                    }
                    else {
                        var dirRow = remoteDirTree.selection.currentIndex;
                        //if the parent is expanded
                        if (remoteDirTree.isContainerOpen(dirRow)) {
                            //collapse
                            remoteDirTree.toggleOpenState(dirRow);
                            //and expand again to update the subtree
                            remoteDirTree.toggleOpenState(dirRow);
                        }
                        else
                            remoteTree.updateView();
                            for (var x = 0; x < remoteTree.rowCount; ++x) {
                                if (remoteTree.data[x].name == val) {
                                    remoteTree.selection.select(x);
                                    remoteTree.treebox.ensureRowIsVisible(x);
                                    break;
                                }
                            }
                    }
                }
                gss.createFolder(remoteTree.currentFolder, val, callback);
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

        // multiple files
        if (this.selection.count > 1) {
            var files = new Array();

            for (var x = 0; x < this.rowCount; ++x) {
                if (this.selection.isSelected(x)) {
                    files.push(this.data[x]);
                }
            }

            var recursiveFolderData = { type: "local", nFolders: 0, nFiles: 0, nSize: 0 };

            for (var x = 0; x < files.length; ++x) {
                if (files[x].isFolder) {
                    ++recursiveFolderData.nFolders;

                    if (recursive) {
                        this.getRecursiveFolderData(files[x], recursiveFolderData);
                    }
                } else {
                    ++recursiveFolderData.nFiles;
                }

                recursiveFolderData.nSize += files[x].isFolder? 0: files[x].size;
            }

            var params = { multipleFiles       : true,
                recursiveFolderData : recursiveFolderData };
     
            window.openDialog("chrome://firegss/content/remoteProperties.xul", "properties", "chrome,modal,dialog,resizable,centerscreen", params);

            return;
        }

        // since were doing threading, the parent path could change
        var origParent = this.data[this.selection.currentIndex].parent;
        var resource = this.data[this.selection.currentIndex];
        // Update the cache first.
        if (resource.isFolder)
            gss.fetchFolder(resource, this.updateProperties, [resource, origParent, recursive]);
        else
            gss.fetchFile(resource, this.updateProperties, [resource, origParent, recursive]);
    },

    updateProperties : function(args) {
        var [file, origParent, recursive] = args;
        if (remoteFile.showProperties(file, recursive)) {
            // since we're working on a separate thread make sure we're in the same directory on refresh
            if (origParent == remoteTree.data[remoteTree.selection.currentIndex].parent) {
                var single = remoteTree.selection.count == 1 ? remoteTree.selection.currentIndex : -1;
                var name = remoteTree.data[remoteTree.selection.currentIndex].leafName;
                var rowDiff = remoteTree.treebox.getLastVisibleRow() - single;

                remoteTree.refresh(false, true);

                if (single != -1) {
                    for (var x = 0; x < remoteTree.rowCount; ++x) {
                        if (remoteTree.data[x].leafName == name) {
                            remoteTree.selection.select(x);
                            remoteTree.treebox.ensureRowIsVisible(rowDiff + x - 1 < remoteTree.rowCount ? rowDiff + x - 1 : remoteTree.rowCount - 1);
                            break;
                        }
                    }
                }
            }
        }
    },
  
    getRecursiveFolderData : function(dir, recursiveFolderData) {
        ++gProcessing;
        //gfiregssUtils.getRecursiveFolderData(dir, new wrapperClass(recursiveFolderData));
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

        //$('remoteCutContext').setAttribute("disabled",   this.searchMode == 2 || !gss.hasAuthenticated());
        //$('remotePasteContext').setAttribute("disabled", this.searchMode == 2 || !gss.hasAuthenticated() || !this.pasteFiles.length);
        $('remoteCreateDir').setAttribute("disabled",    this.searchMode == 2);
        var indexr = remoteDirTree.selection.currentIndex;
        if (indexr >= 0 && indexr < remoteDirTree.data.length) {
            if (remoteDirTree.data[indexr].gssObj.deleted == true) {
                //$('rsep1').setAttribute("hidden",true);
                //$('remoteCutContext').setAttribute("hidden",true);
                // $('remotePasteContext').setAttribute("hidden",true);
                $('rsep2').setAttribute("hidden",true);
                $('rsep3').setAttribute("hidden",true);
                $('remoteCreateDir').setAttribute("hidden",true);
                $('remoteDownload').setAttribute("hidden",true);
                $('remoteOpen').setAttribute("hidden",true);
                $('remoteWeb').setAttribute("hidden",true);
                $('remoteRename').setAttribute("hidden",true);
                $('remoteProperties').setAttribute("hidden",true);
                $('remoteToTrash').setAttribute("hidden",true);
                $('remoteUntrash').setAttribute("hidden",false);
            } else {
                //$('rsep1').setAttribute("hidden",false);
                //$('remoteCutContext').setAttribute("hidden",false);
                // $('remotePasteContext').setAttribute("hidden",false);
                $('rsep2').setAttribute("hidden",false);
                $('rsep3').setAttribute("hidden",false);
                $('remoteCreateDir').setAttribute("hidden",false);
                $('remoteDownload').setAttribute("hidden",false);
                $('remoteOpen').setAttribute("hidden",false);
                $('remoteWeb').setAttribute("hidden",false);
                $('remoteRename').setAttribute("hidden",false);
                $('remoteProperties').setAttribute("hidden",false);
                $('remoteToTrash').setAttribute("hidden",false)
                $('remoteUntrash').setAttribute("hidden",true);
            }
        }
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

    mouseOver : function(event) {
        // display remote folder info
        if (this.rowCount) {
            $('statustxt').label = gStrbundle.getString("remoteListing") + " " + gStrbundle.getFormattedString("objects", [this.rowCount])
                + (this.remoteSize < 0 ? "" : ", " + commas(this.remoteSize)) + ", "
                + gStrbundle.getString("diskSpace")    + " " + this.remoteAvailableDiskSpace;
        } else {
            if (gStrbundle)
                $('statustxt').label = gStrbundle.getString("remoteListingNoObjects");
        }
    },

    // ************************************************* keyEvent *****************************************************

    keyPress : function(event) {
        if (gRemoteTree.editingRow != -1) {
            if (event.keyCode == 27) { //Escape
                if (this.editType == "create") {
                    this.setCellText(-1, "", "");
                }
            }

            return;
        }

        if (this.selection.currentIndex < 0 || this.selection.currentIndex >= this.rowCount) {
            this.selection.currentIndex = this.rowCount - 1;
        }

        if (event.keyCode == 13 && this.selection.count != 0) {                                     // enter
            if (this.selection.count == 1 && this.data[this.selection.currentIndex].isFolder) {  // if it's a directory
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
            $('remotemenu').showPopup(gRemoteTreeChildren, gRemoteTreeChildren.boxObject.x + 75, gRemoteTreeChildren.boxObject.y + y.value + 5, "context");
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

        if (dragObserver.origin.indexOf('remote') != -1 && !gss.hasAuthenticated()) {
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

    updateStats: function () {
        // Update displayed statistics.
        remoteTree.remoteAvailableDiskSpace = parseSize(gss.root.quota.bytesRemaining);
        remoteTree.remoteSize = 0;
        if (remoteTree.currentFolder.files) {
            remoteTree.currentFolder.files.forEach(function (f) {
                remoteTree.remoteSize += f.size;
            });
        }
        remoteTree.remoteSize = parseSize(remoteTree.remoteSize);
    },
  
    showFolderContents: function () {
        var folder = remoteDirTree.data[remoteDirTree.selection.currentIndex].gssObj;
        if (remoteTree.currentFolder == folder) {
            var folderUnchanged = true;
            var previousSelection = remoteTree.selection.currentIndex;
        }
        remoteTree.currentFolder = folder;
        remoteTree.updateStats();
        remoteTree.treebox.rowCountChanged(0, -remoteTree.rowCount);
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
                remoteTree.displayData.push({
                    leafName    : remoteTree.data[row].name,
                    fileSize    : remoteTree.data[row].size,
                    date        : fileDate.toLocaleString(),
                    contentType : remoteTree.data[row].content,
                    extension   : remoteTree.data[row].isFolder? "" : remoteTree.getExtension(remoteTree.data[row].name),
                    attr        : "",
                    icon        : remoteTree.getFileIcon(row),
                    path        : remoteTree.data[row].uri,
                    isDirectory : remoteTree.data[row].isFolder,
                    isSymlink   : false,
                    isHidden    : false
                });
            }
        } else {
            remoteTree.data = [];
            remoteTree.displayData = [];
        }
        remoteTree.rowCount = remoteTree.data.length;
        remoteTree.treebox.rowCountChanged(0, remoteTree.rowCount);
        remoteTree.mouseOver(null);
        if (folderUnchanged) {
            remoteTree.selection.select(previousSelection);
            remoteTree.treebox.ensureRowIsVisible(previousSelection);
        }
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
            if (gOpenMode) {
                this.launch();
            } else {
                new transfer().start(true);
            }
        }
    },
  
    launch: function () {
        if (this.selection.count == 0) {
          return;
        }

        for (var x = 0; x < this.rowCount; ++x) {
            if (this.selection.isSelected(x)) {
                var file = this.data[x];
                var tmpfolder = Cc["@mozilla.org/file/directory_service;1"].
                        getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile);
                // Create a folder name like firegss-4960 for conflict avoidance.
                tmpfolder.append('firegss-' + (Math.random() * 10000).toFixed());
                if (!tmpfolder.exists() || !tmpfolder.isDirectory())
                    tmpfolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
                this.tempDownload(tmpfolder, file);
            }
        }
    },

    // Downloads the specified remote file to the specified local file.
    tempDownload: function (local, remote) {
        var startDownload = function (args) {
            var l = args[0];
            var r = args[1];
            var t = new transfer();
            t.prompt = false;
            t.start(true, r, l.path, r.folder, null, function () {
                var file = Cc["@mozilla.org/file/local;1"]
                      .createInstance(Ci.nsILocalFile);
                file.initWithPath(l.path);
                file.append(r.name);
                localFile.launch(file);
            });
        };
        if (!remote.folder)
            gss.fetchFile(remote, startDownload, [local, remote]);
        else 
            startDownload([local, remote]);
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
