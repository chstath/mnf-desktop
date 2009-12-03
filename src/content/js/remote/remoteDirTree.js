var remoteDirTree = {
	data         : new Array(),
	rowCount     : 0,
	exceptions   : new Array(),
	dirtyList    : new Array(),
	ignoreSelect : false,

	getCellText         : function(row, column)       { return this.data[row].leafName; },
	getLevel            : function(row)               { return this.data[row].level; },
	getParentIndex      : function(row)               { return remoteDirTree.data[row].parentIndex; },
	getImageSrc         : function(row, col)          { },
	getColumnProperties : function(colid, col, props) { },
	getRowProperties    : function(row, props)        { },
	hasNextSibling      : function(row, nextrow)      { return this.data[row].hasNext; },
	isContainer         : function(row)               { return true; },
	isContainerEmpty    : function(row)               { return this.data[row].empty; },
	isContainerOpen     : function(row)               { return remoteDirTree.data[row].open; },
	isSeparator         : function(row)               { return false; },
	isSorted            : function(row)               { return false; },
	setTree             : function(treebox)           {
		this.treebox = treebox;
	},

	getCellProperties : function(row, col, props)   {
	  if (row >= 0 && row < this.data.length && this.data[row]) {
		if (this.data[row].isHidden) {
		  props.AppendElement(gAtomService.getAtom("hidden"));
		}
	  }
	},

	toggleOpenState : function(row, suppressChange) {
		var doOpen = true;

		if (this.isContainerOpen(row)) {
			doOpen = false;
			var level     = this.data[row].level;
			var lastChild = row;

			while (lastChild + 1 < this.rowCount && this.data[lastChild + 1].level > level) {
                // find last index in same level as collapsed dir
				++lastChild;
			}

            // get rid of subdirectories from view
			this.data.splice(row + 1, lastChild - row);
			this.rowCount = this.data.length;
			this.treebox.rowCountChanged(row, -(lastChild - row));

			this.data[row].open = false;
            // update row
			this.treebox.invalidateRow(row);

			var remotePathSlash = gRemotePath.value    + (gRemotePath.value.charAt(gRemotePath.value.length - 1)       != gSlash ? gSlash : '');
			var dataPathSlash  = this.data[row].path + (this.data[row].path.charAt(this.data[row].path.length - 1) != gSlash ? gSlash : '');

			if (remotePathSlash.indexOf(dataPathSlash) == 0 && gRemotePath.value != this.data[row].path
			&& gRemotePath.value.match(gSlash == "/" ? /\x2f/g : /\x5c/g ).length > this.data[row].level && !suppressChange) {
                // we were in a subdirectory and we collapsed
				gRemotePath.value = this.data[row].path;
				this.selection.select(row);
				this.treebox.ensureRowIsVisible(row);
				remoteTree.updateView();
			} else if (gRemotePath.value == this.data[row].path) {
				this.selection.select(row);
				this.treebox.ensureRowIsVisible(row);
			}
		} else {
			for (var x = 0; x < this.dirtyList.length; ++x) {                                            // see if the row is dirty
				if (this.dirtyList[x] == this.data[row].path) {
					this.dirtyList.splice(x, 1);
					this.data[row].children = null;
					break;
				}
			}

			if (this.data[row].children) {                                                               // see if any of the rows children are dirty
				for (var x = 0; x < this.dirtyList.length; ++x) {
					var found = false;

					for (var y = this.data[row].children.length - 1; y >= 0; --y) {
						if (this.data[row].children[y].path == this.dirtyList[x]) {
							found = true;
							this.data[row].children[y].children = null;
							this.data[row].children[y].open     = false;
							this.data[row].children[y].empty    = false;
						} else if (this.data[row].children[y].path.indexOf(this.dirtyList[x]
				                + (this.dirtyList[x].charAt(this.dirtyList[x].length - 1) != gSlash ? gSlash : '')) == 0) {
							found = true;
							this.data[row].children.splice(y, 1);
						}
					}

					if (found) {
						this.dirtyList.splice(x, 1);
					}
				}
			}
//			remoteDirTree.ignoreSelect = true;
			remoteDirTree.expandSubfolders(remoteDirTree.data[row].gssObj);
            gss.fetchFolder(remoteDirTree.data[row].gssObj, remoteDirTree.expandSubfolders, remoteDirTree.data[row].gssObj);
		}

		$('remotedirname').removeAttribute('flex');                                                     // horizontal scrollbars, baby!

		var max = 125;
		for (var z = 0; z < this.rowCount; ++z) {                                                     // this is what we CS folk like to call a TOTAL HACK
			var x = { };    var y = { };    var width = { };    var height = { };                       // but, hey, it works so bite me
			this.treebox.getCoordsForCellItem(z, this.treebox.columns["remotedirname"], "text", x, y, width, height);

			if (x.value + width.value + 125 > max) {
				max = x.value + width.value + 125;
			}
		}

		//if (doOpen) {
		this.readjustHorizontalPosition(row);
		//}

		$('remotedirname').setAttribute('width', max);
	},

		  readjustHorizontalPosition : function(row) {
			var x = { };    var y = { };    var width = { };    var height = { };
			var first = this.treebox.getFirstVisibleRow()    >  0 ? this.treebox.getFirstVisibleRow()    : 0;
			var last  = this.treebox.getLastVisibleRow() - 1 >= 0 ? this.treebox.getLastVisibleRow() - 1 : 0;

			this.treebox.getCoordsForCellItem(row != -1 ? row : 0, this.treebox.columns["remotedirname"], "text", x, y, width, height);
			this.treebox.scrollToHorizontalPosition(this.treebox.horizontalPosition + x.value - 60 >= 0 ? this.treebox.horizontalPosition + x.value - 60 : 0);

			var self = this;
			var func = function() {
			  self.treebox.ensureRowIsVisible(last);
			  self.treebox.ensureRowIsVisible(first);
			};
			if (first < this.data.length) {
			  setTimeout(func, 0);
			}
		  },

		  addDirtyList : function(path) {
			for (var x = 0; x < this.dirtyList.length; ++x) {
			  if (this.dirtyList[x] == path) {
				return;
			  }
			}

			this.dirtyList.push(path);
		  },

		  indexOfPath : function(path) {                                                                   // binary search to find a path in the remoteDirTree
			if (!path) {
			  return -1;
			}

			var left      = 0;
			var right     = this.data.length - 1;
			var origPath  = path;
			path          = path.replace(gSlash == "/" ? /\x2f/g : /\x5c/g, "\x01").toLowerCase();         // make '/' less than everything (except null really)

			while (left <= right) {
			  var mid      = Math.floor((left + right) / 2);
			  var dataPath = this.data[mid].sortPath;
			  if (gSlash == "/" && (this.data[mid].path == origPath || this.data[mid].path + "/" == origPath || this.data[mid].path == origPath + "/")) {
				return mid;
			  } else if (dataPath == path || dataPath + "\x01" == path || dataPath == path + "\x01") {     // kind of complicated but what can you do
				if (gSlash == "\\") {
				  return mid;
				} else {
				  break;
				}
			  } else if (path < dataPath) {
				right = mid - 1;
			  } else if (path > dataPath) {
				left  = mid + 1;
			  }
			}

			if (gSlash == "/") {
			  for (var x = 0; x < this.data.length; ++x) {                                                 // last ditch effort b/c of we have to account for case
				if (this.data[x].path == origPath || this.data[x].path + "/" == origPath || this.data[x].path == origPath + "/") {
				  return x;
				}
			  }
			}

			return -1;
		  },

		  cdup : function() {
			var parentIndex = this.getParentIndex(this.selection.currentIndex);

			if (parentIndex != -1) {
			  this.selection.select(parentIndex);
			}
		  },

		  findDirectory : null,

		  changeDir : function(path, retry) {
			gRemotePath.value  = path;

			if (this.data.length == 0 || this.data[0].path.charAt(0) != gRemotePath.value.charAt(0)) {      // if dirTree is empty
			  var thePath;                                                                                 // we restart the tree

			thePath = "/";
			gSlash  = "/";
			  try {                                                                                        // make sure we have a valid drive
//		        var dir     = localFile.init(thePath);
				var entries = gss.subfolders;//dir.directoryEntries;
			  } catch (ex) {
				error(gStrbundle.getString("noPermission"));
				return;
			  }

			  var oldRowCount = this.rowCount;
			  this.data       = new Array();
			  this.rowCount   = 0;
			  this.treebox.rowCountChanged(0, -oldRowCount);

			  this.data.push({ open        : false,
							   empty       : false,
							   hasNext     : false,
							   parentIndex : -1,
							   children    : null,
							   path        : thePath,
							   leafName    : thePath,
							   parent      : "",
							   isHidden    : false,
							   level       : 0,
							   sortPath    : thePath//.replace(/\x2f/g, "\x01").toLowerCase()
							});

			  this.rowCount = 1;
			  this.treebox.rowCountChanged(0, 1);
			}

			var bestMatch;
			var bestPath;
			var remotePathLevel = gRemotePath.value.match(/\x2f/g).length;

			for (var x = 0; x < this.data.length; ++x) {                                                   // open parent directories til we find the directory
			  for (var y = this.data.length - 1; y >= x; --y) {
				if ((gRemotePath.value.indexOf(this.data[y].path) == 0)
					&& (this.getLevel(y) < remotePathLevel || gRemotePath.value == this.data[y].path)) {
				  x         = y;
				  bestMatch = y;
				  bestPath  = this.data[y].path;
				  break;
				}
			  }

			  if (gRemotePath.value.indexOf(this.data[x].path) == 0) {
				var dirty = false;

				for (var z = 0; z < this.dirtyList.length; ++z) {
				  if (this.dirtyList[z] == this.data[x].path) {
					dirty = true;
					break;
				  }
				}

				this.ignoreSelect = true;
				if (this.data[x].open && dirty) {
				  this.toggleOpenState(x);
				  this.toggleOpenState(x);
				}

				if (this.data[x].empty && dirty) {
				  this.data[x].empty = false;
				  this.treebox.invalidateRow(x);
				}

				if (!this.data[x].open && (gRemotePath.value != this.data[x].path || x == 0)) {
				  this.toggleOpenState(x);
				}
				this.ignoreSelect = false;

				if (gRemotePath.value == this.data[x].path) {
				  gRemotePathFocus = gRemotePath.value;                                                      // directory approved
				  var sString  = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
				  sString.data = gRemotePath.value;
				  gPrefs.setComplexValue("folder", Components.interfaces.nsISupportsString, sString);      // remember last directory

				  remoteTree.updateView();

				  this.readjustHorizontalPosition(this.selection.currentIndex);

				  if (gTreeSync && !gTreeSyncManager) {
					treeSyncManager(true);
				  } else {
					gTreeSyncManager = false;
				  }

				  return;
				}
			  }
			}

			if (gTreeSyncManager) {
			  gTreeSyncManager = false;

			  if (bestMatch) {
				gRemotePath.value = bestPath;
				gRemotePathFocus  = bestPath;
				remoteTree.updateView();
			  }

			  return;
			}

			var findDirectory = localFile.init(gRemotePath.value);                                          // we didn't find the directory above

			if (localFile.verifyExists(findDirectory) && findDirectory.isDirectory() && (!retry || gRemotePath.value != path)) {
			  this.findDirectory = findDirectory;
			  var tempPath = gRemotePath.value;
			  this.selection.select(bestMatch);                                                            // it's possible the directory was added externally
			  remoteTree.refresh(true);                                                                     // and we don't have it on our dir list
			  this.findDirectory = null;
			  this.changeDir(tempPath, true);
			}
		  },

		  click : function(event) {
            // this is a special case: if we want the search to go away
            var index = this.selection.currentIndex;

			if (index >= 0 && index < this.data.length && (this.data[index].path == gRemotePath.value && remoteTree.searchMode)) {
			  this.changeDir(this.data[index].path);
			}
		  },

		  keyPress : function(event) {
			if (event.keyCode == 8) {
              // backspace
			  this.cdup();
			} else if (event.keyCode == 116) {
              // F5
			  event.preventDefault();
			  remoteTree.refresh(false, true);
			}
		  },

		  canDrop : function(index, orient) {
			if (index == -1 || orient != 0 || !dragObserver.origin || dragObserver.origin == "external") {
			  return false;
			}

			if (dragObserver.origin.indexOf('remote') != -1 && !gss.hasAuthenticated()) {
			  return false;
			}

			if (dragObserver.origin == 'localtreechildren') {                                              // can't move into a subdirectory of itself
			  for (var x = 0; x < remoteTree.rowCount; ++x) {
				var dataPathSlash  = this.data[index].path  + (this.data[index].path.charAt(this.data[index].path.length - 1)   != gSlash ? gSlash : '');
				var remoteTreeSlash = remoteTree.data[x].path + (remoteTree.data[x].path.charAt(remoteTree.data[x].path.length - 1) != gSlash ? gSlash : '');

				if (remoteTree.selection.isSelected(x) && ((dataPathSlash.indexOf(remoteTreeSlash) == 0 && remoteTree.data[x].isDirectory())
														|| this.data[index].path == remoteTree.data[x].parent.path
														|| this.data[index].path == remoteTree.data[x].parent.path + gSlash)) {
				  return false;
				}
			  }
			}

			return true;
		  },

		  drop : function(index, orient) {
			if (dragObserver.origin == 'localtreechildren') {
			  remoteTree.cut();
			  remoteTree.paste(this.data[index].path);
			} else if (dragObserver.origin == 'remotetreechildren') {
			  var anyFolders = false;

			  for (var x = 0; x < remoteTree.rowCount; ++x) {
				if (remoteTree.selection.isSelected(x) && remoteTree.data[x].isDirectory()) {
				  anyFolders = true;
				  break;
				}
			  }

			  if (anyFolders && this.data[index].path != gRemotePath.value) {
				var self      = this;
				var path      = this.data[index].path;
				var remotePath = gRemotePath.value;
				var func = function() { self.dropCallback(path, remotePath); };
				ftpObserver.extraCallback = func;
			  }

			  var transferObj          = new transfer();
			  transferObj.localRefresh = gRemotePath.value;
			  transferObj.start(true,  '', this.data[index].path, '');
			}
		  },

		  dropCallback : function(newParent, remotePath) {
			var refreshIndex = this.indexOfPath(newParent);

			if (refreshIndex != -1) {
			  if (this.data[refreshIndex].open) {
				this.toggleOpenState(refreshIndex, true);                                                  // close it up
				this.data[refreshIndex].children = null;                                                   // reset its children
				this.toggleOpenState(refreshIndex);                                                        // and open it up again
			  } else {
				this.data[refreshIndex].children = null;                                                   // reset its children
				this.data[refreshIndex].empty    = false;
				this.treebox.invalidateRow(refreshIndex);
			  }

			  var refreshIndex2 = this.indexOfPath(remotePath);

			  if (refreshIndex2 == -1) {
				this.changeDir(remotePath);
			  } else {
				this.selection.select(refreshIndex2);
			  }
			} else {
			  this.addDirtyList(newParent);
			}
		  },

	initialize: function(folder) {
		remoteDirTree.data = new Array();
		remoteDirTree.rowCount = 0;
		remoteDirTree.treebox.rowCountChanged(0, 0);

		remoteDirTree.data.push({
								   open        : false,
								   empty       : false,
								   hasNext     : false,
								   parentIndex : -1,
								   children    : null,
								   path        : "/",
								   leafName    : folder.name,
								   parent      : "",
								   isHidden    : false,
								   level       : 0,
								   sortPath    : "/",
								   gssObj	   : folder
								});

		remoteDirTree.rowCount = 1;
		remoteDirTree.treebox.rowCountChanged(0, 1);
		remoteDirTree.selection.select(0);
		remoteTree.showFolderContents();
		remoteDirTree.treebox.invalidateRow(0);
        gss.fetchTrash(remoteDirTree.initializeTrash);
	},

    initializeTrash: function (folder) {
		remoteDirTree.data.push({
								   open        : false,
								   empty       : false,
								   hasNext     : false,
								   parentIndex : -1,
								   children    : null,
								   path        : "/",
								   leafName    : "Trash",
								   parent      : "",
								   isHidden    : false,
								   level       : 0,
								   sortPath    : "/",
								   gssObj	   : folder
								});

		remoteDirTree.rowCount++;
		remoteDirTree.treebox.rowCountChanged(remoteDirTree.rowCount-1, 1);
		remoteDirTree.treebox.invalidateRow(remoteDirTree.rowCount-1);
		gss.fetchShared(remoteDirTree.initializeMyShared);
	},
	
	initializeMyShared: function (folder) {
		remoteDirTree.data.push({
								   open        : false,
								   empty       : false,
								   hasNext     : false,
								   parentIndex : -1,
								   children    : null,
								   path        : "/",
								   leafName    : "My Shared",
								   parent      : "",
								   isHidden    : false,
								   level       : 0,
								   sortPath    : "/",
								   gssObj	   : folder
								});

		remoteDirTree.rowCount++;
		remoteDirTree.treebox.rowCountChanged(remoteDirTree.rowCount-1, 1);
		remoteDirTree.treebox.invalidateRow(remoteDirTree.rowCount-1);
	},

	select: function(event) {
	    var index, gssObj;
        if (remoteDirTree.ignoreSelect)
            return;
		index = remoteDirTree.selection.currentIndex;
		if (index >= 0 && index < remoteDirTree.data.length) {
            gssObj = remoteDirTree.data[index].gssObj;
            remoteTree.showFolderContents();
            gss.fetchFolder(gssObj, remoteTree.showFolderContents);
		    remoteDirTree.treebox.ensureRowIsVisible(index);
		}
	},

	expandSubfolders: function(folder) {
		var row = 0;
		for (var i=0; i<remoteDirTree.data.length; i++)
			if (remoteDirTree.data[i].gssObj === folder) {
				row = i;
				break;
			}
		var level     = remoteDirTree.data[row].level;
		var lastChild = row;

        // find last index in same level as collapsed dir
		while (lastChild + 1 < remoteDirTree.rowCount && remoteDirTree.data[lastChild + 1].level > level) {
		  ++lastChild;
		}
        var currentSelection = remoteDirTree.selection.currentIndex;
        // get rid of subdirectories from view
		remoteDirTree.data.splice(row + 1, lastChild - row);
		remoteDirTree.rowCount = remoteDirTree.data.length;
		remoteDirTree.treebox.rowCountChanged(row, -(lastChild - row));
        
        if (remoteDirTree.data[row].children) {
			for (var x = remoteDirTree.data[row].children.length - 1; x >= 0; --x) {
				remoteDirTree.data.splice(row + 1, 0, remoteDirTree.data[row].children[x]);
			}

			remoteDirTree.rowCount           = remoteDirTree.data.length;
			remoteDirTree.treebox.rowCountChanged(row + 1, remoteDirTree.data[row].children.length);
			remoteDirTree.data[row].children = null;
			remoteDirTree.data[row].open     = true;
			remoteDirTree.treebox.invalidateRow(row);
		} else {
            // get data for this directory
			var newDirectories = new Array();

			var entries = remoteDirTree.data[row].gssObj.folders;
			if (entries) {
				for (var i=0; i<entries.length; i++) {
    				// get subdirectories
					var file = entries[i];
					newDirectories.push(file);
				}
				if (newDirectories.length == 0)  {
                    // no subdirectories
					remoteDirTree.data[row].empty = true;
					remoteDirTree.data[row].open  = false;
				} else {
                    // has subdirectories
					remoteDirTree.data[row].empty = false;
					remoteDirTree.data[row].open = true;
					for (var x = 0; x < newDirectories.length; ++x) {
						newDirectories[x] = { open        : false,
												empty       : false,
												hasNext     : true,
												parentIndex : row,
												children    : null,
												path        : newDirectories[x].uri,
												leafName    : newDirectories[x].name,
												level       : newDirectories[x].level,
												sortPath    : newDirectories[x].uri,
												gssObj      : newDirectories[x]
											};
					}
					newDirectories.sort(directorySort);
					newDirectories[newDirectories.length - 1].hasNext = false;                               // last one doesn't have a next

					for (var x = newDirectories.length - 1; x >= 0; --x) {
						remoteDirTree.data.splice(row + 1, 0, newDirectories[x]);
					}
					remoteDirTree.rowCount       = remoteDirTree.data.length;
					remoteDirTree.treebox.rowCountChanged(row + 1, newDirectories.length);
                    remoteDirTree.selection.select(currentSelection);
				}

//				remoteDirTree.treebox.invalidateRow(row);
			}
			else {
				remoteDirTree.data[row].empty = true;
				remoteDirTree.data[row].open  = false;
			}
		}
//		remoteDirTree.ignoreSelect = false;
	},

    indexOfFolder: function(folder) {
        for (var i=0; i<remoteDirTree.data.length; i++)
            if (remoteDirTree.data[i].gssObj == folder)
                return i;
        return -1;
    }

};
