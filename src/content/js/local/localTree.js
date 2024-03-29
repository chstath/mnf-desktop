var localTree = {
	data : new Array(),
	displayData : new Array(),
	rowCount : 0,
	localSize : 0,
	localAvailableDiskSpace : 0,
	searchMode : 0,
	isEditing : false,
	editType : "",
	editParent : null,
	rememberSort : null,

	getParentIndex : function(row) {
		return -1;
	},
	getLevel : function(row) {
		return 0;
	},
	getRowProperties : function(row, props) {
	},
	getColumnProperties : function(colid, col, props) {
	},
	isContainer : function(row) {
		return false;
	},
	isSeparator : function(row) {
		return false;
	},
	isSorted : function(row) {
		return false;
	},
	setTree : function(treebox) {
		this.treebox = treebox;
	},

	getCellText : function(row, column) { // text for the files
		if (row >= 0 && row < this.data.length) {
			switch (column.id) {
			case "localname":
				return this.searchMode == 2 ? this.displayData[row].path
						: this.displayData[row].leafName;
			case "localsize":
				return this.displayData[row].fileSize;
			case "localdate":
				return this.displayData[row].date;
			case "localtype":
				return this.displayData[row].extension;
			case "localattr":
				return this.displayData[row].attr;
			default:
				return " ";
			}
		}

		return "";
	},

	getImageSrc : function(row, col) {
		return row >= 0 && row < this.data.length && col.id == "localname"
				&& this.displayData[row].icon ? this.displayData[row].icon : "";
	},

	cycleHeader : function(col) {
		var sortDirection = col.element.getAttribute("sortDirection") == "ascending"
				|| col.element.getAttribute("sortDirection") == "natural" ? "descending"
				: "ascending";
		$('localname').setAttribute("sortDirection", "natural");
		$('localsize').setAttribute("sortDirection", "natural");
		$('localdate').setAttribute("sortDirection", "natural");
		$('localtype').setAttribute("sortDirection", "natural");
		$('localattr').setAttribute("sortDirection", "natural");
		col.element.setAttribute("sortDirection", sortDirection);
		this.sort();
	},

	getCellProperties : function(row, col, props) {
		if (row >= 0 && row < this.data.length && this.data[row]) {
			if (col.id == "localname") {
				if (this.displayData[row].isDirectory) {
					props.AppendElement(gAtomService.getAtom("isFolder"));
				} else if (this.displayData[row].isSymlink) {
					props.AppendElement(gAtomService.getAtom("isLink"));
				}

				props.AppendElement(gAtomService.getAtom("nameCol"));
			}

			if (dragObserver.overName) {
				props.AppendElement(gAtomService.getAtom("overName"));
			}

			if (this.displayData[row].isHidden) {
				props.AppendElement(gAtomService.getAtom("hidden"));
			}

			if (this.displayData[row].isCut) {
				props.AppendElement(gAtomService.getAtom("cut"));
			}
		}
	},

	// ****************************************************** updateView
	// ***************************************************

	updateView : function(files) {
		var localTreeItems = new Array();

		if (!files) {
			this.searchMode = 0;
			gLocalTreeChildren.removeAttribute('search');

			try {
				this.localSize = 0;
				var dir = localFile.init(gLocalPath.value);
				this.localAvailableDiskSpace = parseSize(dir.diskSpaceAvailable); // get
				// local
				// disk
				// size
				var entries = dir.directoryEntries;

				while (entries.hasMoreElements()) {
					var file = entries.getNext().QueryInterface(
							Components.interfaces.nsILocalFile);
					var isException = false;

					for ( var x = 0; x < localDirTree.exceptions.length; ++x) {
						if (gSlash == "/") {
							isException = localDirTree.exceptions[x].path == file.path;
						} else {
							isException = localDirTree.exceptions[x].path
									.toLowerCase() == file.path.toLowerCase();
						}

						if (isException) {
							break;
						}
					}

					if (file.exists() && localFile.testSize(file)
							&& (!file.isHidden() || gHiddenMode || isException)) {
						this.localSize += file.fileSize;
						localTreeItems.push(file);
					}
				}

				this.localSize = parseSize(this.localSize); // get directory
				// size
				this.data = localTreeItems; // update localTree
			} catch (ex) {
				debug(ex);
				this.data = new Array();
				this.displayData = new Array();
				this.treebox.rowCountChanged(0, -this.rowCount);
				this.rowCount = this.data.length;
				this.treebox.rowCountChanged(0, this.rowCount);
				this.mouseOver(null);
				error(gStrbundle.getString("noPermission"));
				return;
			}
		} else {
			if (this.localSize != -1) {
				this.data = new Array();
				this.displayData = new Array();
				this.treebox.rowCountChanged(0, -this.rowCount);

				this.rememberSort = {
					cols : [ "localname", "localsize", "localdate",
							"localtype", "localattr" ],
					vals : [ $('localname').getAttribute("sortDirection"),
							$('localsize').getAttribute("sortDirection"),
							$('localdate').getAttribute("sortDirection"),
							$('localtype').getAttribute("sortDirection"),
							$('localattr').getAttribute("sortDirection") ]
				};
			}

			files.sort(compareName);

			for ( var x = 0; x < files.length; ++x) {
				this.data.push(files[x]);
			}

			this.localSize = -1;
			this.searchMode = this.searchMode ? this.searchMode
					: (gSearchRecursive ? 2 : 1);
			gLocalTreeChildren.setAttribute('search', true);
		}

		this.sort(files);

		var index = localDirTree.indexOfPath(gLocalPath.value); // select
		// directory in
		// localDirTree
		localDirTree.selection.select(index);
		localDirTree.treebox.ensureRowIsVisible(index);

		if (this.data.length && !files) {
			this.selection.select(0); // select first element in localTree
		}

		this.mouseOver(null);

		if (files) {
			return;
		}

		var anyFolders = false; // see if the folder has any subfolders
		for ( var x = 0; x < this.data.length; ++x) {
			if (this.data[x].isDirectory()) {
				anyFolders = true;
				break;
			}
		}

		if (!anyFolders) { // and if there are no subfolders then update our
			// tree
			if (localDirTree.data[index].open) { // if localDirTree is open
				localDirTree.toggleOpenState(index);
			}

			localDirTree.data[index].empty = true;
			localDirTree.data[index].open = false;
			localDirTree.data[index].children = null;

			for ( var x = 0; x < localDirTree.dirtyList.length; ++x) {
				if (localDirTree.dirtyList[x] == gLocalPath.value) {
					localDirTree.dirtyList.splice(x, 1);
					break;
				}
			}
		} else if (anyFolders && localDirTree.data[index].empty) {
			localDirTree.data[index].empty = false;
		}

		localDirTree.treebox.invalidateRow(index);
	},

	sort : function(files) {
		if (!files) {
			if (this.rememberSort) {
				for ( var x = 0; x < this.rememberSort.cols.length; ++x) {
					$(this.rememberSort.cols[x]).setAttribute("sortDirection",
							this.rememberSort.vals[x]);
				}

				this.rememberSort = null;
			}

			this.sortHelper($('localname'),
					this.searchMode == 2 ? directorySort2 : compareName);
			this.sortHelper($('localsize'), compareSize);
			this.sortHelper($('localdate'), compareDate);
			this.sortHelper($('localtype'), compareType);
			this.sortHelper($('localattr'), compareLocalAttr);

			this.displayData = new Array();
		} else {
			$('localname').setAttribute("sortDirection", "natural");
			$('localsize').setAttribute("sortDirection", "natural");
			$('localdate').setAttribute("sortDirection", "natural");
			$('localtype').setAttribute("sortDirection", "natural");
			$('localattr').setAttribute("sortDirection", "natural");
		}

		var start = files ? this.data.length - files.length : 0;

		for ( var row = start; row < this.data.length; ++row) {
			this.displayData.push( {
				leafName : this.data[row].leafName,
				fileSize : this.getFormattedFileSize(row),
				date : this.getFormattedDate(row),
				extension : this.data[row].isDirectory() ? "" : this
						.getExtension(this.data[row].leafName),
				attr : this.data[row].permissions ? this.convertPermissions(
						this.data[row].isHidden(), this.data[row].permissions)
						: "",
				icon : this.getFileIcon(row),
				path : this.data[row].path,
				isDirectory : this.data[row].isDirectory(),
				isSymlink : this.data[row].isSymlink(),
				isHidden : this.data[row].isHidden()
			});
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
		if (el.getAttribute("sortDirection")
				&& el.getAttribute("sortDirection") != "natural") {
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
			return gBytesMode ? "0  " : gStrbundle.getFormattedString(
					"kilobyte", [ "0" ])
					+ "  ";
		}

		if (gBytesMode) {
			return commas(this.data[row].fileSize) + "  ";
		}

		return gStrbundle.getFormattedString("kilobyte", [ commas(Math
				.ceil(this.data[row].fileSize / 1024)) ])
				+ "  ";
	},

	getFormattedDate : function(row) {
		var date = new Date(this.data[row].lastModifiedTime);

		if ((new Date()).getFullYear() > date.getFullYear()) { // if not
			// current year,
			// display old
			// year
			return gMonths[date.getMonth()] + ' ' + date.getDate() + ' '
					+ date.getFullYear();
		}

		var time = date.toLocaleTimeString(); // else display time
		var ampm = time.indexOf('AM') != -1 ? ' AM'
				: (time.indexOf('PM') != -1 ? ' PM' : '');
		return gMonths[date.getMonth()] + ' ' + date.getDate() + ' '
				+ time.substring(0, time.lastIndexOf(':')) + ampm;
	},

	getExtension : function(leafName) {
		return leafName.lastIndexOf(".") != -1 ? leafName.substring(
				leafName.lastIndexOf(".") + 1, leafName.length).toLowerCase()
				: "";
	},

	convertPermissions : function(hidden, permissions) {
		if (gSlash == "\\") { // msdos
			var returnString = "";

			if (permissions == 438) { // Normal file (666 in octal)
				returnString = gStrbundle.getString("normalFile");
			} else if (permissions == 511) { // Executable file (777 in
				// octal)
				returnString = gStrbundle.getString("executableFile");
			} else if (permissions == 292) { // Read-only (444 in octal)
				returnString = gStrbundle.getString("readOnlyFile");
			} else if (permissions == 365) { // Read-only and executable (555
				// in octal)
				returnString = gStrbundle.getString("readOnlyExecutableFile");
			} else {
				returnString = " ";
			}

			if (hidden) {
				returnString += gStrbundle.getString("hiddenFile");
			}

			return returnString;
		} else {
			permissions = permissions.toString(8);

			if (gPlatform == 'mac') {
				permissions = permissions.substring(permissions.length - 4);
			}

			permissions = parseInt(permissions, 8);
			var binary = permissions.toString(2);
			var permissionsString = "";

			for ( var x = 0; x < 9; x += 3) {
				permissionsString += binary.charAt(0 + x) == "1" ? "r" : "-";
				permissionsString += binary.charAt(1 + x) == "1" ? "w" : "-";
				permissionsString += binary.charAt(2 + x) == "1" ? "x" : "-";
			}

			return permissionsString;
		}
	},

	getFileIcon : function(row) {
		if (this.data[row].isDirectory() || this.data[row].isSymlink()) {
			return "";
		}

		var fileURI = gIos.newFileURI(this.data[row]);
		return "moz-icon://" + fileURI.spec + "?size=16"; // thanks to alex
		// sirota!
	},

	// ************************************************** refresh
	// *******************************************************

	refresh : function(skipLocalTree, skipDelay) {
		if (localDirTree.data[localDirTree.selection.currentIndex].open) { // if
			// localDirTree
			// is
			// open
			localDirTree.toggleOpenState(localDirTree.selection.currentIndex); // close
			// it
			// up
			localDirTree.data[localDirTree.selection.currentIndex].children = null; // reset
			// its
			// children
			localDirTree.toggleOpenState(localDirTree.selection.currentIndex); // and
			// open
			// it
			// up
			// again
		} else {
			localDirTree.data[localDirTree.selection.currentIndex].empty = false; // not
			// empty
			// anymore
			localDirTree.data[localDirTree.selection.currentIndex].children = null; // reset
			// its
			// children
			localDirTree.treebox
					.invalidateRow(localDirTree.selection.currentIndex);
		}

		if (!skipLocalTree) {
			if (skipDelay) {
				this.updateView();
			} else {
				setTimeout("localTree.updateView()", 1000); // update localTree,
				// after a little
				// bit
			}
		}
	},

	// ****************************************************** file functions
	// ***************************************************

	constructPath : function(parent, leafName) {
		return parent
				+ (parent.charAt(parent.length - 1) != gSlash ? gSlash : '')
				+ leafName;
	},

	launch : function() {
		if (this.selection.count == 0) {
			return;
		}

		for ( var x = 0; x < this.rowCount; ++x) {
			if (this.selection.isSelected(x)) {
				if (!localFile.verifyExists(this.data[x])) {
					continue;
				}

				localFile.launch(this.data[x]);
			}
		}
	},

	openContainingFolder : function() {
		if (this.selection.currentIndex < 0
				|| this.selection.currentIndex >= this.rowCount
				|| !localFile
						.verifyExists(this.data[this.selection.currentIndex].parent)) {
			return;
		}

		localDirTree
				.changeDir(this.data[this.selection.currentIndex].parent.path);
	},

	extract : function(toFolder) {
		if (this.selection.count == 0) {
			return;
		}

		var files = new Array();

		for ( var x = 0; x < this.rowCount; ++x) {
			if (this.selection.isSelected(x)) {
				if (!localFile.verifyExists(this.data[x])) {
					continue;
				}

				files.push(this.data[x]);
			}
		}

		for ( var x = 0; x < files.length; ++x) {
			var extension = this.getExtension(files[x].leafName);
			if (extension != "zip" && extension != "jar" && extension != "xpi") {
				continue;
			}

			this.extractHelper(toFolder, files[x]);
		}
	},

	extractHelper : function(toFolder, file) { // code modified from
		try { // http://xulfr.org/wiki/RessourcesLibs/lireExtraireZip
			var origParent = gLocalPath.value; // since were doing threading,
			// the parent path could change
			// during extraction
			++gProcessing;
			var zip = Components.classes["@mozilla.org/libjar/zip-reader;1"]
					.createInstance(Components.interfaces.nsIZipReader);
			zip.open(file);

			var leafNameNoExt = file.leafName.lastIndexOf(".") != -1 ? file.leafName
					.substring(0, file.leafName.lastIndexOf("."))
					: file.leafName;
			var localParent = toFolder ? this.constructPath(file.parent.path,
					leafNameNoExt) : file.parent.path;
			var folder = localFile.init(localParent);

			if (!folder.exists()) {
				folder
						.create(
								Components.interfaces.nsILocalFile.DIRECTORY_TYPE,
								0755);
			}

			var prompt = true;
			var skipAll = false;

			var entries = zip.findEntries("*");

			while (entries.hasMore()) {
				var entry = entries.getNext();
				var destFolder = localFile.init(localParent);
				var entrySplit = entry.split('/');

				for ( var x = 0; x < entrySplit.length; ++x) {
					if (x == entrySplit.length - 1 && entrySplit[x].length != 0) {
						destFolder.append(entrySplit[x]);
						var zipEntry = zip.getEntry(entry);

						if (destFolder.exists() && skipAll) {
							break;
						}

						if (destFolder.exists() && prompt) { // ask nicely
							var params = {
								response : 0,
								fileName : destFolder.path,
								resume : true,
								replaceResume : true,
								existingSize : destFolder.fileSize,
								existingDate : "",
								newSize : zipEntry.realSize,
								newDate : "",
								timerEnable : false
							};

							window
									.openDialog(
											"chrome://firegss/content/confirmFile.xul",
											"confirmFile",
											"chrome,modal,dialog,resizable,centerscreen",
											params);

							if (params.response == 2) {
								prompt = false;
							} else if (params.response == 3) {
								break;
							} else if (params.response == 4
									|| params.response == 0) {
								--gProcessing;
								return;
							} else if (params.response == 5) {
								skipAll = true;
								break;
							}
						}

						var innerEx = gfiregssUtils.extract(zip, entry,
								destFolder);

						if (innerEx) {
							throw innerEx;
						}

						break;
					}

					destFolder.append(entrySplit[x]);

					try {
						if (!destFolder.exists()) {
							destFolder
									.create(
											Components.interfaces.nsILocalFile.DIRECTORY_TYPE,
											0755);
						}
					} catch (ex) {
					}
				}
			}

			zip.close();

			if (origParent == gLocalPath.value) { // since we're extracting on
				// a separate thread make
				// sure we're in the same
				// directory on refresh
				this.refresh();
			} else {
				localDirTree.addDirtyList(origParent);
			}
		} catch (ex) {
			error(gStrbundle.getString("errorExtract"));
			debug(ex);
		} finally {
			--gProcessing;
		}
	},

	create : function(isDir) {
		if (this.searchMode == 2) {
			return;
		}

		this.data.push( {
			leafName : "",
			fileSize : "",
			date : "",
			extension : "",
			attr : "",
			path : "",
			isDir : isDir,
			isDirectory : function() {
				return this.isDir;
			},
			isSymlink : function() {
				return false;
			},
			isHidden : false
		});
		this.displayData.push( {
			leafName : "",
			fileSize : "",
			date : "",
			extension : "",
			attr : "",
			icon : isDir ? "" : "moz-icon://file?size=16",
			path : "",
			isDirectory : isDir,
			isSymlink : false,
			isHidden : false
		});
		++this.rowCount;
		this.treebox.rowCountChanged(this.rowCount - 1, 1);
		this.treebox.ensureRowIsVisible(this.rowCount - 1);

		this.editType = "create";
		this.editParent = gLocalPath.value;
		setTimeout(
				"gLocalTree.startEditing(localTree.rowCount - 1, gLocalTree.columns['localname'])",
				0);
	},

	remove : function() {
		if (this.selection.count == 0) {
			return;
		}

		var count = this.selection.count;
		var files = new Array();

		for ( var x = 0; x < this.rowCount; ++x) {
			if (this.selection.isSelected(x)) {
				if (!localFile.verifyExists(this.data[x])) {
					continue;
				}

				files.push(this.data[x]);
			}
		}

		var origParent = gLocalPath.value; // since were doing threading, the
		// parent path could change during
		// deleting
		var prompt = true;

		for ( var x = 0; x < files.length; ++x) {
			if (!localFile.remove(files[x], prompt, count)) {
				break;
			}

			prompt = false;
		}

		if (origParent == gLocalPath.value) { // since we're deleting on a
			// separate thread make sure
			// we're in the same directory
			// on refresh
			this.refresh(false, true);
		} else {
			localDirTree.addDirtyList(origParent);
		}
	},

	rename : function() {
		if (this.rowCount > 0 && this.selection.count > 0) {
			if (this.selection.currentIndex < 0
					|| this.selection.currentIndex >= this.rowCount) {
				this.selection.currentIndex = this.rowCount - 1;
			}

			if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
				return;
			}

			this.displayData[this.selection.currentIndex].origLeafName = this.data[this.selection.currentIndex].leafName;
			this.displayData[this.selection.currentIndex].origPath = this.data[this.selection.currentIndex].path;

			if (this.searchMode == 2) {
				this.displayData[this.selection.currentIndex].path = this.displayData[this.selection.currentIndex].leafName;
				this.treebox.invalidateRow(this.selection.currentIndex);
			}

			this.editType = "rename";
			this.editParent = gLocalPath.value;
			gLocalTree.startEditing(this.selection.currentIndex,
					gLocalTree.columns["localname"]);
		}
	},

	isEditable : function(row, col) {
		var canEdit = row >= 0 && row < this.data.length
				&& col.id == "localname";
		this.isEditing = canEdit;
		return canEdit;
	},

	setCellText : function(row, col, val) {
		if (!this.isEditing || this.editParent != gLocalPath.value) { // for
			// some
			// reason,
			// this
			// is
			// called
			// twice
			// - so
			// we
			// prevent
			// this
			return;
		}

		this.isEditing = false;
		if (this.editType == "rename") {
			if (this.data[row].leafName == val) {
				// do nothing
			} else if (localFile.rename(this.data[row], val)) {
				var rowDiff = this.treebox.getLastVisibleRow() - row;

				this.refresh(false, true);

				for ( var x = 0; x < this.rowCount; ++x) {
					if (this.data[x].leafName == val) {
						this.selection.select(x);
						this.treebox
								.ensureRowIsVisible(rowDiff + x - 1 < this.rowCount ? rowDiff
										+ x - 1
										: this.rowCount - 1);
						break;
					}
				}
			} else {
				this.displayData[row].leafName = val;
				this.treebox.invalidateRow(row);
				setTimeout("gLocalTree.startEditing(" + row
						+ ", gLocalTree.columns['localname'])", 0);
			}
		} else if (this.editType == "create") {
			if (val) {
				if (localFile.create(this.data[row].isDir, val)) {
					this.refresh(false, true);

					for ( var x = 0; x < this.rowCount; ++x) {
						if (this.data[x].leafName == val) {
							this.selection.select(x);
							this.treebox.ensureRowIsVisible(x);
							break;
						}
					}
				} else {
					this.data[row].leafName = val;
					this.displayData[row].leafName = val;
					this.treebox.invalidateRow(row);
					setTimeout(
							"gLocalTree.startEditing(localTree.rowCount - 1, gLocalTree.columns['localname'])",
							0);
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

		if (this.selection.currentIndex < 0
				|| this.selection.currentIndex >= this.rowCount) {
			this.selection.currentIndex = this.rowCount - 1;
		}

		if (this.selection.count > 1) { // multiple files
			var files = new Array();

			for ( var x = 0; x < this.rowCount; ++x) {
				if (this.selection.isSelected(x)) {
					if (!localFile.verifyExists(this.data[x])) {
						continue;
					}

					files.push(this.data[x]);
				}
			}

			var recursiveFolderData = {
				type : "local",
				nFolders : 0,
				nFiles : 0,
				nSize : 0
			};

			for ( var x = 0; x < files.length; ++x) {
				if (!localFile.verifyExists(files[x])) {
					continue;
				}

				if (files[x].isDirectory()) {
					++recursiveFolderData.nFolders;

					if (recursive) {
						this.getRecursiveFolderData(files[x],
								recursiveFolderData);
					}
				} else {
					++recursiveFolderData.nFiles;
				}

				recursiveFolderData.nSize += files[x].fileSize;
			}

			var params = {
				multipleFiles : true,
				recursiveFolderData : recursiveFolderData
			};

			window.openDialog("chrome://firegss/content/properties.xul",
					"properties", "chrome,modal,dialog,resizable,centerscreen",
					params);

			return;
		}

		if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
			return;
		}

		var origParent = gLocalPath.value; // since were doing threading, the
		// parent path could change

		if (localFile.showProperties(this.data[this.selection.currentIndex],
				recursive)) {
			if (origParent == gLocalPath.value) { // since we're working on a
				// separate thread make sure
				// we're in the same
				// directory on refresh
				var single = this.selection.count == 1 ? this.selection.currentIndex
						: -1;
				var name = this.data[this.selection.currentIndex].leafName;
				var rowDiff = this.treebox.getLastVisibleRow() - single;

				this.refresh(false, true);

				if (single != -1) {
					for ( var x = 0; x < this.rowCount; ++x) {
						if (this.data[x].leafName == name) {
							this.selection.select(x);
							this.treebox
									.ensureRowIsVisible(rowDiff + x - 1 < this.rowCount ? rowDiff
											+ x - 1
											: this.rowCount - 1);
							break;
						}
					}
				}
			}
		}
	},

	getRecursiveFolderData : function(dir, recursiveFolderData) {
		++gProcessing;
		localTree.getRecursiveFolderData1(dir, new wrapperClass(recursiveFolderData));
		--gProcessing;
	},

	getRecursiveFolderData1 : function(dir, recursiveFolderData) {
		recursiveFolderData = recursiveFolderData.wrappedJSObject.obj;
		var self = this;
		var func = function() {
			self.getRecursiveFolderData2(dir, recursiveFolderData);
		}; // <strike>separate thread</strike>
		func(); // dispatchEvent(func);
	},
	
	getRecursiveFolderData2 : function(dir, recursiveFolderData) {
		try {
			var entries = dir.directoryEntries;

			while (entries.hasMoreElements()) {
				var file = entries.getNext().QueryInterface(
						Components.interfaces.nsILocalFile);

				if (file.exists() && this.testSize(file)
						&& (!file.isHidden() || this.hiddenMode)) {
					if (file.isDirectory()) {
						++recursiveFolderData.nFolders;
						this.getRecursiveFolderData2(file, recursiveFolderData);
					} else {
						++recursiveFolderData.nFiles;
					}

					recursiveFolderData.nSize += file.fileSize;
				}
			}
		} catch (ex) {
			// do nothing, skip this directory
		}
	},

	testSize : function(file) { // XXX in linux, files over 2GB throw an
								// exception
		try {
			var x = file.fileSize;
			return true;
		} catch (ex) {
			return false;
		}
	},

	// ************************************************* mouseEvent
	// *****************************************************

	dblClick : function(event) {
		if (event.button != 0
				|| event.originalTarget.localName != "treechildren"
				|| this.selection.count == 0) {
			return;
		}

		if (this.selection.currentIndex < 0
				|| this.selection.currentIndex >= this.rowCount) {
			this.selection.currentIndex = this.rowCount - 1;
		}

		if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
			return;
		}

		if (this.data[this.selection.currentIndex].isDirectory()) { // if it's a
			// directory
			localDirTree.changeDir(this.data[this.selection.currentIndex].path); // navigate
			// to
			// it
		} else {
			if (gOpenMode) {
				this.launch();
			} else {
				new transfer().start(false); // else upload the file
			}
		}
	},

	click : function(event) {
		if (event.button == 1 && !$('localPasteContext').disabled) { // middle-click
			// paste
			this.paste();
		}
	},

	createContextMenu : function() {
		if (this.selection.currentIndex < 0
				|| this.selection.currentIndex >= this.rowCount) {
			this.selection.currentIndex = this.rowCount - 1;
		}

		$('localOpenCont').collapsed = this.searchMode != 2;
		$('localOpenContSep').collapsed = this.searchMode != 2;
		// $('localCutContext').setAttribute("disabled", this.searchMode == 2);
		// $('localCopyContext').setAttribute("disabled", this.searchMode == 2);
		// $('localPasteContext').setAttribute("disabled", this.searchMode == 2
		// || !this.pasteFiles.length);
		$('localCreateDir').setAttribute("disabled",
				this.searchMode == 2 || pendingDownloads());
		$('localCreateFile').setAttribute("disabled",
				this.searchMode == 2 || pendingDownloads());

		if (this.selection.currentIndex == -1) {
			return;
		}

		var hasDir = false;
		for ( var x = 0; x < this.rowCount; ++x) {
			if (this.selection.isSelected(x)) {
				if (this.data[x].isDirectory()) {
					hasDir = true;
					break;
				}
			}
		}

		$('localRecursiveProperties').setAttribute("disabled", !hasDir);

		var extension = this
				.getExtension(this.data[this.selection.currentIndex].leafName);
		var isZippy = extension == "zip" || extension == "jar"
				|| extension == "xpi";
		$('extractHereContext').collapsed = !isZippy;
		$('extractToContext').collapsed = !isZippy;
	},

	mouseOver : function(event) { // display local folder info
		if (this.rowCount) {
			$('statustxt').label = gStrbundle.getString("localListing")
					+ " "
					+ gStrbundle.getFormattedString("objects",
							[ this.rowCount ])
					+ (this.localSize < 0 ? "" : ", " + commas(this.localSize))
					+ ", " + gStrbundle.getString("diskSpace") + " "
					+ this.localAvailableDiskSpace;
		} else {
			if (gStrbundle)
				$('statustxt').label = gStrbundle
						.getString("localListingNoObjects");
		}
	},

	// ************************************************* keyEvent
	// *****************************************************

	keyPress : function(event) {
		if (gLocalTree.editingRow != -1) {
			if (event.keyCode == 27) {
				if (this.editType == "create") {
					this.setCellText(-1, "", "");
				} else {
					this.displayData[gLocalTree.editingRow].leafName = this.displayData[gLocalTree.editingRow].origLeafName;
					this.displayData[gLocalTree.editingRow].path = this.displayData[gLocalTree.editingRow].origPath;
					this.treebox.invalidateRow(gLocalTree.editingRow);
				}
			}

			return;
		}

		if (this.selection.currentIndex < 0
				|| this.selection.currentIndex >= this.rowCount) {
			this.selection.currentIndex = this.rowCount - 1;
		}

		if (event.keyCode == 13 && this.selection.count != 0) { // enter
			if (!localFile.verifyExists(this.data[this.selection.currentIndex])) {
				return;
			}

			if (this.selection.count == 1
					&& this.data[this.selection.currentIndex].isDirectory()) { // if
				// it's
				// a
				// directory
				localDirTree
						.changeDir(this.data[this.selection.currentIndex].path); // navigate
				// to
				// it
			} else {
				if (gOpenMode) {
					this.launch();
				} else {
					new transfer().start(false); // else upload a file
				}
			}
		} else if (event.ctrlKey && (event.which == 65 || event.which == 97)) {
			event.preventDefault(); // ctrl-a: select all
			this.selection.selectAll();
		} else if (event.ctrlKey && event.keyCode == 32
				&& this.selection.count != 0) { // ctrl-space, select or
			// deselect
			this.selection.toggleSelect(this.selection.currentIndex);
		} else if (event.keyCode == 8) { // backspace
			event.preventDefault();
			localDirTree.cdup();
		} else if (event.keyCode == 116) { // F5
			event.preventDefault();
			this.refresh(false, true);
		} else if (event.keyCode == 113 && this.selection.count != 0) { // F2
			this.rename();
		} else if (event.charCode == 100 && event.ctrlKey) { // ctrl-d
			event.preventDefault();
			this.create(true);
		} else if (event.charCode == 110 && event.ctrlKey) { // ctrl-n
			event.preventDefault();
			this.create(false);
		} else if (event.keyCode == 46 && this.selection.count != 0) { // del
			this.remove();
		} else if (event.keyCode == 93) { // display context menu
			var x = {};
			var y = {};
			var width = {};
			var height = {};
			this.treebox.getCoordsForCellItem(this.selection.currentIndex,
					this.treebox.columns["localname"], "text", x, y, width,
					height);
			this.createContextMenu();
			$('localmenu').showPopup(gLocalTreeChildren,
					gLocalTreeChildren.boxObject.x + 75,
					gLocalTreeChildren.boxObject.y + y.value + 5, "context");
		} else if (event.charCode == 112 && event.ctrlKey
				&& this.selection.count != 0) { // ctrl-p
			event.preventDefault();
			this.showProperties(false);
		} else if (event.charCode == 120 && event.ctrlKey
				&& this.selection.count != 0) { // ctrl-x
			event.preventDefault();
			this.cut();
		} else if (event.charCode == 99 && event.ctrlKey
				&& this.selection.count != 0) { // ctrl-c
			event.preventDefault();
			this.copy();
		} else if (event.charCode == 118 && event.ctrlKey) { // ctrl-v
			event.preventDefault();
			this.paste();
		} else if (event.charCode == 111 && event.ctrlKey) { // ctrl-o
			event.preventDefault();
			this.launch();
		}
	},

	// ************************************************* cut, copy, paste
	// *****************************************************

	isCut : false,
	pasteFiles : new Array(),
	oldParent : "",

	cut : function() {
		this.copy(true);
	},

	copy : function(isCut) {
		if (this.searchMode == 2) {
			return;
		}

		if (this.selection.count == 0) {
			return;
		}

		this.isCut = isCut;
		this.pasteFiles = new Array();
		this.oldParent = gLocalPath.value;

		for ( var x = 0; x < this.rowCount; ++x) { // put files to be
			// cut/copied in an array to
			// be pasted
			if (this.selection.isSelected(x)) {
				if (localFile.verifyExists(this.data[x])) {
					this.pasteFiles.push(this.data[x]);
					this.displayData[x].isCut = isCut;
					this.treebox.invalidateRow(x);
				}
			}
		}

		$('localPasteContext').setAttribute("disabled", false); // enable
		// pasting
	},

	paste : function(dest) {
		if (this.searchMode == 2) {
			return;
		}

		if (this.pasteFiles.length == 0) {
			return;
		}

		var zeFiles = new Array();
		for ( var x = 0; x < this.pasteFiles.length; ++x) {
			zeFiles.push(this.pasteFiles[x]);
		}

		var newParent = dest ? dest : gLocalPath.value;

		if (!localFile.verifyExists(zeFiles[0])) {
			return;
		}

		for ( var x = 0; x < zeFiles.length; ++x) {
			var newParentSlash = newParent
					+ (newParent.charAt(newParent.length - 1) != gSlash ? gSlash
							: '');
			var pasteFileSlash = zeFiles[x].path
					+ (zeFiles[x].path.charAt(zeFiles[x].path.length - 1) != gSlash ? gSlash
							: '');

			if (zeFiles[x].isDirectory()
					&& newParentSlash.indexOf(pasteFileSlash) == 0) { // can't
				// copy
				// into
				// a
				// subdirectory
				// of
				// itself
				doAlert(gStrbundle.getString("copySubdirectory"));
				return;
			}
		}

		var prompt = true;
		var skipAll = false;
		var anyFolders = false;
		++gProcessing;

		try {
			var newDir = localFile.init(newParent);

			for ( var x = 0; x < zeFiles.length; ++x) {
				if (!localFile.verifyExists(zeFiles[x])) {
					continue;
				}

				if (zeFiles[x].isDirectory()) {
					anyFolders = true;
				}

				var newFile = localFile.init(this.constructPath(newDir.path,
						zeFiles[x].leafName));

				if (newFile.exists() && skipAll) {
					continue;
				}

				if (newFile.exists()
						&& (newFile.isDirectory() || zeFiles[x].isDirectory())) {
					error(gStrbundle.getFormattedString("pasteErrorFile",
							[ zeFiles[x].path ]));
					continue;
				}

				if (newFile.exists() && prompt) { // ask nicely
					var params = {
						response : 0,
						fileName : newFile.path,
						resume : true,
						replaceResume : true,
						existingSize : newFile.fileSize,
						existingDate : newFile.lastModifiedTime,
						newSize : zeFiles[x].fileSize,
						newDate : zeFiles[x].lastModifiedTime,
						timerEnable : false
					};

					window.openDialog(
							"chrome://firegss/content/confirmFile.xul",
							"confirmFile",
							"chrome,modal,dialog,resizable,centerscreen",
							params);

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

				var innerEx = gfiregssUtils.cutCopy(this.isCut, zeFiles[x],
						newFile, newDir, null);

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
			var refreshIndex = dest ? localDirTree.indexOfPath(newParent)
					: localDirTree.indexOfPath(this.oldParent);

			if (refreshIndex != -1) {
				if (localDirTree.data[refreshIndex].open) {
					localDirTree.toggleOpenState(refreshIndex, true); // close
					// it up
					localDirTree.data[refreshIndex].children = null; // reset
					// its
					// children
					localDirTree.toggleOpenState(refreshIndex); // and open it
					// up again
				} else {
					localDirTree.data[refreshIndex].children = null; // reset
					// its
					// children
					localDirTree.data[refreshIndex].empty = false;
					localDirTree.treebox.invalidateRow(refreshIndex);
				}

				if (currentDir == gLocalPath.value) {
					var refreshIndex2 = localDirTree.indexOfPath(currentDir);

					if (refreshIndex2 == -1) {
						localDirTree.changeDir(currentDir);
					} else {
						localDirTree.selection.select(refreshIndex2);
					}
				}
			} else {
				localDirTree.addDirtyList(dest ? newParent : this.oldParent);
			}
		}

		if (this.isCut) {
			this.pasteFiles = new Array();
			this.isCut = false;
			$('localPasteContext').setAttribute("disabled", true);
		}

		if (currentDir == gLocalPath.value) { // since we're working on a
			// separate thread make sure
			// we're in the same directory
			// on refresh
			this.refresh();
		} else {
			var path = gLocalPath.value;
			var refreshIndex = localDirTree.indexOfPath(currentDir);

			if (refreshIndex != -1) {
				if (localDirTree.data[refreshIndex].open) {
					localDirTree.toggleOpenState(refreshIndex, true); // close
					// it up
					localDirTree.data[refreshIndex].children = null; // reset
					// its
					// children
					localDirTree.toggleOpenState(refreshIndex); // and open it
					// up again
				} else {
					localDirTree.data[refreshIndex].children = null; // reset
					// its
					// children
					localDirTree.data[refreshIndex].empty = false;
					localDirTree.treebox.invalidateRow(refreshIndex);
				}

				var refreshIndex2 = localDirTree.indexOfPath(path);

				if (refreshIndex2 == -1) {
					localDirTree.changeDir(path);
				} else {
					localDirTree.selection.select(refreshIndex2);
				}
			} else {
				localDirTree.addDirtyList(currentDir);
			}
		}
	},

	canDrop : function(index, orient) {
		if (index == -1 || !this.data[index].isDirectory()
				|| !dragObserver.origin || dragObserver.origin == "external") {
			return false;
		}

		if (dragObserver.origin == 'localtreechildren') { // don't drag onto
			// itself
			for ( var x = 0; x < this.rowCount; ++x) {
				if (this.selection.isSelected(x) && index == x) {
					return false;
				}
			}
		}

		if (dragObserver.origin.indexOf('remote') != -1
				&& !gss.hasAuthenticated()) {
			return false;
		}

		return true;
	},

	drop : function(index, orient) {
		if (dragObserver.origin == 'localtreechildren') {
			this.cut();
			this.paste(this.data[index].path);
		} else if (dragObserver.origin == 'remotetreechildren') {
			if (!dragObserver.overName || index == -1
					|| !this.data[index].isDirectory()) {
				new transfer().start(true);
			} else {
				var transferObj = new transfer();
				transferObj.localRefresh = gLocalPath.value;
				transferObj.start(true, '', this.data[index].path, '');
			}
		}
	}
};
