function transfer() {
	this.prompt             = true;
	this.skipAll            = false;
	this.cancel             = false;
	this.busy               = false;
	this.didRefreshLaterSet = false;
	this.remoteRefresh      = '';
	this.localRefresh       = '';
}

transfer.prototype = {
	start : function(download, aFile, aLocalParent, aRemoteParent, aListData) {
		if (this.cancel || ( download && !aFile && remoteTree.selection.count == 0 && !aLocalParent)
			|| (!download && !aFile && localTree.selection.count  == 0 && !aLocalParent)) {
			return;
		}

        // we're doing locking, sort of, see below
		if (this.busy) {
			var self = this;
			var currentListData = aListData ? aListData : [];//cloneArray(gFtp.listData);
			var func = function() {
				self.start(download, aFile, aLocalParent, aRemoteParent, currentListData);
			};
			setTimeout(func, 500);
			return;
		}

		var localParent  = aLocalParent  ? aLocalParent  : gLocalPath.value;
		var remoteParent = aRemoteParent ? aRemoteParent : "";
		var files        = new Array();
		var resume;
		var listData     = aListData ? aListData : [];//gFtp.listData;

		if (gNoPromptMode) {
            // overwrite dialog is disabled, do overwrites
			this.prompt = false;
		}

		if (aFile) {
            // populate the files variable with what we're transferring
			files.push(aFile);
		} else if (download) {
            // download specific
			if (aRemoteParent) {
                // if recursive
				files = listData;
			} else {
                // if not recursive
				for (var x = 0; x < remoteTree.rowCount; ++x) {
					if (remoteTree.selection.isSelected(x)) {
						files.push(remoteTree.data[x]);
					}
				}
			}
		} else {
            // upload specific
            // if not recursive
			for (var x = 0; x < localTree.rowCount; ++x) {
				if (localTree.selection.isSelected(x)) {
					if (!localFile.verifyExists(localTree.data[x])) {
						continue;
					}

					files.push(localTree.data[x]);
				}
			}
		}

		if (download && aLocalParent) {
			localDirTree.addDirtyList(aLocalParent);
		} else if (!download && aRemoteParent) {
			remoteDirTree.addDirtyList(aRemoteParent);
		}

		for (var x = 0; x < files.length; ++x) {
			var fileName = download ? files[x].name : files[x].leafName;

			if (this.getPlatform() == "windows") {
                // scrub out illegal characters on windows / \ : * ? | " < >
				fileName = fileName.replace(/[/\\:*?|"<>]/g, '_');
			}

//			var remotePath = !download ? gFtp.constructPath     (remoteParent, fileName) : files[x].path;
			var remoteFolder = !download ? (aRemoteParent ? aRemoteParent : remoteDirTree.data[remoteDirTree.selection.currentIndex].gssObj) : null;
			var localPath  =  download ? localTree.constructPath(localParent,  fileName) : files[x].path;
			var file;

			if (download) {
                // check to see if file exists
				file = localFile.init(localPath);
			} else {
				file = { exists: function() { return false; } };
				var remoteList = aRemoteParent ? aRemoteParent.folders.concat(aRemoteParent.files) : remoteTree.data;

				for (var y = 0; y < remoteList.length; ++y) {
					if (remoteList[y].name == fileName) {
						file = { fileSize: remoteList[y].size, lastModifiedTime: remoteList[y].modificationDate,
                            leafName: remoteList[y].name, name: remoteList[y].name, exists: function() { return true; },
							isDir: remoteList[y].isFolder, isDirectory: function() { return this.isDir }};
						var existingFolder = remoteList[y];
						break;
					}
				}
			}

			if (files[x].fileSize >= 4294967296) {
				error(gStrbundle.getFormattedString("tooBig", [files[x].leafName]));
				continue;
			}

			if (this.skipAll && file.exists() && !file.isDirectory()) {
				continue;
			}

			resume = false;

			if (file.exists() && this.prompt) {

                if (!download) {
                    var url = remoteFolder.uri.slice(gss.root.fileroot.length);
                    if (url.slice(url.length-1) !== '/')
                        url = url + '/';
                    url = url + fileName;
                }
				var params = { response         : 0,
							fileName         : download ? localPath : url,
							existingSize     : file.fileSize,
							existingDate     : file.lastModifiedTime,
							newSize          : download ? files[x].size : files[x].fileSize,
							newDate          : download ? files[x].modificationDate : files[x].lastModifiedTime,
							timerEnable      : false };

                    // ooo, the fun of doing semi-multi-threaded stuff in firefox
					this.busy = true;
					// we're doing some 'locking' above

					window.openDialog("chrome://firegss/content/confirmFile.xul", "confirmFile", "chrome,modal,dialog,resizable,centerscreen", params);

					this.busy = false;

					if (params.response == 1) {
						resume       = false;
					} else if (params.response == 2) {
						this.prompt  = false;
						resume       = false;
					} else if ((params.response == 3) || (params.response == 0)) {
						continue;
					} else if (resume && params.response == 4) {
						resume       = true;
					} else if (!resume && params.response == 4) {
						this.cancel  = true;

					break;
				} else if (params.response == 5) {
					this.skipAll = true;
					continue;
				}
			}

			if (!this.didRefreshLaterSet) {
				this.didRefreshLaterSet = true;

//				if ((download && !aLocalParent) || this.localRefresh) {
//					gFtp.localRefreshLater  = this.localRefresh  ? this.localRefresh  : localParent;
//				}

//				if ((!download && !aRemoteParent) || this.remoteRefresh) {
//					gFtp.remoteRefreshLater = this.remoteRefresh ? this.remoteRefresh : remoteParent;
//				}
			}

			if (download) {
                // if the directory doesn't exist we create it
				if (files[x].isFolder) {
					if (!file.exists()) {
						try {
							file.create(Ci.nsILocalFile.DIRECTORY_TYPE, 0755);
						} catch (ex) {
							debug(ex);
							error(gStrbundle.getFormattedString("failedDir", [remotePath]));
							continue;
						}
					}
					this.recurseFolder(localPath, files[x]);
				} else {
                    // download the file
					// create a persist
					var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
					// with persist flags if desired. See nsIWebBrowserPersist page for more PERSIST_FLAGS.
					const nsIWBP = Ci.nsIWebBrowserPersist;
					const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
					persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

					var nsIFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
					nsIFile.initWithPath(localPath);
					var ext = files[x].name.substring(files[x].name.lastIndexOf('.') + 1);
					if (ext !== '')
						icon = "moz-icon://."+ext+"?size=16";
					else
						icon = "moz-icon://"+files[x].name+"?size=16&contentType="+files[x].content;

					var obj = {
					  source  : files[x].uri,
					  dest    : localPath,
					  size    : files[x].size,
                      mtime   : files[x].modificationDate,
					  type    : gStrbundle.getString("download"),
					  icon    : icon,
					  ela     : '',
					  remain  : '',
					  rate    : '',
					  percent : '',
					  status  : '',
					  mode    : '',
					  failed  : false
					};

					var IListener = Components.interfaces["nsIWebProgressListener"];
					persist.progressListener = {
						transferObject: obj,
						onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
							if (aMaxTotalProgress <= 0)
								aMaxTotalProgress = 1;
							var percentComplete = parseInt(aCurTotalProgress/aMaxTotalProgress * 100) + "%";
							this.transferObject.mode = "determined";
							this.transferObject.percent = percentComplete;
							this.transferObject.size = percentComplete + " - " + commas(aCurTotalProgress) +"/" + commas(aMaxTotalProgress);
							this.transferObject.status = "Transferring";
							queueTree.treebox.invalidate();
							localTree.refresh();
							showWorking(percentComplete);
						},
						onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
							if (aStateFlags & IListener.STATE_START) {
								queueTree.data.push(this.transferObject);
								var oldCount  = queueTree.rowCount;
								queueTree.rowCount = queueTree.data.length;
								queueTree.treebox.rowCountChanged(oldCount - 1, queueTree.rowCount - oldCount);
								queueTree.treebox.invalidate();
								queueTree.treebox.ensureRowIsVisible(queueTree.rowCount-1);
								showWorking();
							}
							else if (aStateFlags & IListener.STATE_STOP) {
								this.transferObject.status = 'Finished';
								qprocessing = false;
								queueTree.treebox.invalidate();
                                nsIFile.lastModifiedTime = this.transferObject.mtime;
                                // Work around Windows brainded DST handling.
                                var diff = this.transferObject.mtime - nsIFile.lastModifiedTime;
                                if (diff !== 0)
                                    nsIFile.lastModifiedTime = this.transferObject.mtime + diff;
                                
								localTree.refresh();
								hideWorking();
							}
						}
					}
					// do the save
					eventq.push({ type: 'download', file: files[x], nsIFile: nsIFile, persist: persist });
				}
			} else {
				if (files[x].isDirectory()) {                        // if the directory doesn't exist we create it
				    var self = this;
					var nextAction = function() {
						var lf = files[x];
						return function(folder) {
							var contents = lf.directoryEntries;
							var folderQueue = [];
							while (contents.hasMoreElements()) {
								var child = contents.getNext().QueryInterface(Components.interfaces.nsILocalFile);
								if (!child.isDirectory())
    								self.start(false, child, lf, folder);
    							else
    							    folderQueue.push(child);
							}
							for (var ff=0; ff<folderQueue.length; ff++)
							    self.start(false, folderQueue[ff], lf, folder);
						};
					}();
					if (!file.exists()) {
						gss.createFolder(remoteFolder, files[x].leafName, nextAction);
					}
					else {
					    gss.fetchFolder(existingFolder, nextAction, existingFolder);
					}
				} else {
					var ext = fileName.substring(fileName.lastIndexOf('.') + 1);
                    var fileSize = files[x].fileSize;
                    var mtime = files[x].lastModifiedTime;
					var obj = {
					  source  : localPath,
					  dest    : remoteFolder.uri,
					  size    : fileSize,
                      name    : fileName,
                      rParent : remoteParent,
                      mtime   : mtime,
					  type    : gStrbundle.getString("upload"),
					  icon    : "moz-icon://."+ext+"?size=16",
					  ela     : '',
					  remain  : '',
					  rate    : '',
					  percent : '',
					  status  : '',
					  mode    : '',
					  failed  : false
					};
					var loadStartHandler = function() {
						var o = obj;
						return function(evt) {
							queueTree.data.push(o);
							if (evt.lengthComputable) {
								var percentComplete = parseInt(evt.loaded/evt.total * 100) + "%";
								o.mode = "determined";
								o.percent = percentComplete;
								o.size = percentComplete + " - " + commas(evt.loaded) +"/" + commas(evt.total);
								o.status = "Transferring";
								showWorking(percentComplete);
							}
							var oldCount  = queueTree.rowCount;
							queueTree.rowCount = queueTree.data.length;
							queueTree.treebox.rowCountChanged(oldCount - 1, queueTree.rowCount - oldCount);
							queueTree.treebox.invalidate();
							queueTree.treebox.ensureRowIsVisible(queueTree.rowCount-1);
						};
					}();
					var progressHandler = function() {
						var o = obj;
						return function(evt) {
							if (evt.lengthComputable) {
								var percentComplete = parseInt(evt.loaded/evt.total * 100) + "%";
								o.mode = "determined";
								o.percent = percentComplete;
								o.size = percentComplete + " - " + commas(evt.loaded) +"/" + commas(evt.total);
								o.status = "Transferring";
								queueTree.treebox.invalidate();
								showWorking(percentComplete);
							}
						};
					}();
					var loadHandler = function() {
						var o = obj;
						return function(evt) {
							if (evt.lengthComputable) {
								var percentComplete = parseInt(evt.loaded/evt.total * 100) + "%";
								o.mode = "determined";
								o.percent = percentComplete;
								o.size = percentComplete + " - " + commas(evt.loaded) +"/" + commas(evt.total);
							}
							obj.status = "Finished";
							qprocessing = false;
							queueTree.treebox.invalidate();
							remoteTree.refresh(false, true);
							hideWorking();
                            var uploaded = {};
                            uploaded.name = o.name;
                            // Make sure the folder URI ends with a slash.
                            var destUri = o.dest.slice(-1) === '/' ? o.dest : o.dest + '/';
                            uploaded.uri = destUri + o.name.replace(/ /g, "+");
                            uploaded.folder = o.rParent;
                            gss.update(uploaded, { modificationDate: o.mtime });
						};
					}();
					var errorHandler = function(evt) {
						var o = obj;
						return function(evt) {
							if (evt.lengthComputable) {
								var percentComplete = parseInt(evt.loaded/evt.total * 100) + "%";
								o.mode = "determined";
								o.percent = percentComplete;
								o.size = percentComplete + " - " + commas(evt.loaded) +"/" + commas(evt.total);
							}
							o.status = "Failed";
							o.failed = true;
							qprocessing = false;
							queueTree.treebox.invalidate();
							hideWorking();
						};
					}();
					var abortHandler = function(evt) {
						var o = obj;
						return function(evt) {
							if (evt.lengthComputable) {
								var percentComplete = parseInt(evt.loaded/evt.total * 100) + "%";
								o.mode = "determined";
								o.percent = percentComplete;
								o.size = percentComplete + " - " + commas(evt.loaded) +"/" + commas(evt.total);
							}
							o.status = "Canceled";
							qprocessing = false;
							queueTree.treebox.invalidate();
							hideWorking();
						}
					}();
					eventq.push({ type: 'upload',
                               file: files[x],
					           folder: remoteFolder,
					           onstart: loadStartHandler,
					           onprogress: progressHandler,
					           onload: loadHandler,
					           onerror: errorHandler,
					           onabort: abortHandler
					});
				}
			}
		}
	},

	getPlatform : function() {
		var platform = navigator.platform.toLowerCase();

		if (platform.indexOf('linux') != -1) {
			return 'linux';
		}

		if (platform.indexOf('mac') != -1) {
			return 'mac';
		}

		return 'windows';
	},

	recurseFolder: function(localPath, remoteFolder) {
    	var self = this;
	    var func = function(folder) {
		    var parent = folder.parentPath;
		    for (var i=0; i<folder.files.length; i++)
			    self.start(true, folder.files[i], parent);
		    for (var i=0; i<folder.folders.length; i++)
			    self.start(true, folder.folders[i], parent);
	    }
		remoteFolder.parentPath = localPath;
		gss.fetchFolder(remoteFolder, func, remoteFolder);
	}
};
