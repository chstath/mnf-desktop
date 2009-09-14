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
			var currentListData = aListData ? aListData : cloneArray(gFtp.listData);
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
			if (aLocalParent) {
                // if recursive
				try {
					var dir     = localFile.init(localParent);
					var innerEx = gfiregssUtils.getFileList(dir, new wrapperClass(files));

					if (innerEx) {
						throw innerEx;
					}
				} catch (ex) {
					debug(ex);
                    // skip this directory
					return;
				}
			} else {
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
		}

		if (download && aLocalParent) {
			localDirTree.addDirtyList(aLocalParent);
		} else if (!download && aRemoteParent) {
			remoteDirTree.addDirtyList(aRemoteParent);
		}

		for (var x = 0; x < files.length; ++x) {
			var fileName = download ? files[x].name : files[x].leafName;

			if ((download && gDownloadCaseMode == 1) || (!download && gUploadCaseMode == 1)) {
                // special request to change filename case
				fileName = fileName.toLowerCase();
			} else if ((download && gDownloadCaseMode == 2) || (!download && gUploadCaseMode == 2)) {
                // special request to change filename case
				fileName = fileName.toUpperCase();
			}

			if (this.getPlatform() == "windows") {
                // scrub out illegal characters on windows / \ : * ? | " < >
				fileName = fileName.replace(/[/\\:*?|"<>]/g, '_');
			}

//			var remotePath = !download ? gFtp.constructPath     (remoteParent, fileName) : files[x].path;
			var remoteFolder = !download ? (aRemoteParent ? aRemoteParent : remoteDirTree.data[remoteDirTree.selection.currentIndex].gssObj) : null;
			var localPath  =  download ? localTree.constructPath(localParent,  fileName) : files[x].path;
			var file;

			if (download) {                                        // check to see if file exists
				file           = localFile.init(localPath);
			} else {
				file           = { exists: function() { return false; } };
				var remoteList = aRemoteParent ? listData : remoteTree.data;

				for (var y = 0; y < remoteList.length; ++y) {
					if (remoteList[y].name == fileName) {
						file       = { fileSize: remoteList[y].size, lastModifiedTime: remoteList[y].modificationDate, leafName: name, exists: function() { return true; },
							isDir: remoteList[y].isFolder, isDirectory: function() { return this.isDir }};
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

			if (file.exists() && this.prompt && !files[x].isFolder) {

				var params = { response         : 0,
							fileName         : download ? localPath : remoteFolder.uri + fileName,
							existingSize     : file.fileSize,
							existingDate     : file.lastModifiedTime,
							newSize          : download ? files[x].size : files[x].fileSize,
							newDate          : download ? files[x].modificationDate : files[x].lastModifiedTime,
							timerEnable      : false };

					this.busy = true;                                    // ooo, the fun of doing semi-multi-threaded stuff in firefox
															 // we're doing some 'locking' above

					for (var y = 0; y < gMaxCon; ++y) {
						gConnections[y].waitToRefresh = true;
					}
                    //TODO: Check if it remembers "overwrite all" and "skip all"
                    //TODO: Check if the prompt works ok for multiple file uploads
                    //TODO: Check if the prompt works ok for recursive folder uploads
					window.openDialog("chrome://firegss/content/confirmFile.xul", "confirmFile", "chrome,modal,dialog,resizable,centerscreen", params);

					for (var y = 0; y < gMaxCon; ++y) {
						gConnections[y].waitToRefresh = false;
					}

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

					for (var y = 0; y < gMaxCon; ++y) {
						if (gConnections[y].isConnected) {
							gConnections[y].abort();
						}
					}
					break;
				} else if (params.response == 5) {
					this.skipAll = true;
					continue;
				}
			}

			if (!this.didRefreshLaterSet) {
				this.didRefreshLaterSet = true;

				if ((download && !aLocalParent) || this.localRefresh) {
					gFtp.localRefreshLater  = this.localRefresh  ? this.localRefresh  : localParent;
				}

				if ((!download && !aRemoteParent) || this.remoteRefresh) {
					gFtp.remoteRefreshLater = this.remoteRefresh ? this.remoteRefresh : remoteParent;
				}
			}

			if (download) {
				if (files[x].isFolder) {                        // if the directory doesn't exist we create it
					if (!file.exists()) {
						try {
							file.create(Components.interfaces.nsILocalFile.DIRECTORY_TYPE, 0755);
						} catch (ex) {
							debug(ex);
							error(gStrbundle.getFormattedString("failedDir", [remotePath]));
							continue;
						}
					}
					files[x].parentPath = localPath;
					gss.fetchFolder(files[x], this.recurseFolder, files[x]);
//					this.downloadHelper(localPath, remotePath);
				} else {                                             // download the file
					// create a persist
					var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
					// with persist flags if desired See nsIWebBrowserPersist page for more PERSIST_FLAGS.
					const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
					const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
					persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

					var nsIFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
					nsIFile.initWithPath(localPath);
					var auth = gss.getAuth("GET", files[x].uri);
					var nsIURI = gIos.newURI(files[x].uri + "?" + auth.authString, "utf-8", null);
					var ext = files[x].name.substring(files[x].name.lastIndexOf('.') + 1);
					if (ext !== '')
						icon = "moz-icon://."+ext+"?size=16";
					else
						icon = "moz-icon://"+name+"?size=16&contentType="+files[x].content;

					var obj = {
//					  id      : info.id,
					  source  : files[x].uri,
					  dest    : localPath,
					  size    : files[x].size,
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
						},
						onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
							if (aStateFlags & IListener.STATE_START) {
								queueTree.data.push(this.transferObject);
								var oldCount  = queueTree.rowCount;
								queueTree.rowCount = queueTree.data.length;
								queueTree.treebox.rowCountChanged(oldCount - 1, queueTree.rowCount - oldCount);
								queueTree.treebox.invalidate();
							}
							else if (aStateFlags & IListener.STATE_STOP) {
								this.transferObject.status = 'Finished';
								queueTree.treebox.invalidate();
								localTree.refresh();
							}
						}
					}
					// do the save
					persist.saveURI(nsIURI, null, null, null, "", nsIFile);
				}
			} else {
				if (files[x].isDirectory()) {                        // if the directory doesn't exist we create it
					if (!file.exists()) {
						var nextAction = function() {
							var lf = files[x];
							return function(folder) {
//								remoteTree.refresh(false, true);
								var contents = lf.directoryEntries;
								while(contents.hasMoreElements()) {
									var child = contents.getNext().QueryInterface(Components.interfaces.nsILocalFile);
									if (child.isDirectory()) {
										new transfer().start(false, child, lf, folder);
									}
									else {
										new transfer().start(false, child, lf, folder);
									}
								}
							};
						}();
						gss.createFolder(remoteFolder, files[x].leafName, nextAction);

//						this.start(false, '', localPath, remotePath);
					}
				} else {
					var ext = fileName.substring(fileName.lastIndexOf('.') + 1);
					var obj = {
//					  id      : info.id,
					  source  : localPath,
					  dest    : remoteFolder.uri,
					  size    : files[x].fileSize,
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
							}
							var oldCount  = queueTree.rowCount;
							queueTree.rowCount = queueTree.data.length;
							queueTree.treebox.rowCountChanged(oldCount - 1, queueTree.rowCount - oldCount);
							queueTree.treebox.invalidate();
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
							queueTree.treebox.invalidate();
							remoteTree.refresh(false, true);
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
							queueTree.treebox.invalidate();
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
							queueTree.treebox.invalidate();
						}
					}();
					gss.uploadFile(files[x], remoteFolder, loadStartHandler, progressHandler, loadHandler, errorHandler, abortHandler);
				}
			}
		}
	},

	downloadHelper : function(localPath, remotePath) {
		var self = this;
		var func = function() {                                  // we use downloadHelper b/c if we leave it inline the closures will apply
			self.start(true,  '', localPath, remotePath);
		};
		gFtp.list(remotePath, func, true);
	},

	uploadHelper   : function(localPath, remotePath) {
		var self = this;
		var func = function() {                                  // we use uploadHelper   b/c if we leave it inline the closures will apply
			gFtp.removeCacheEntry(remotePath);
			self.start(false, '', localPath, remotePath);
		};
		gFtp.list(remotePath, func, true);
	},

	getConnection : function(func) {
		if (gConcurrent == 1) {                                                 // short circuit
			return gFtp;
		}

		for (var x = 0; x < gConcurrent && x < gMaxCon; ++x) {
			if (gConnections[x].isConnected && gConnections[x].isReady) {         // pick the first ready connection
				return gConnections[x];
			}

			if (x && !gConnections[x].isConnected && gConnections[x].type != 'bad' && !gConnections[x].isReady && !gConnections[x].eventQueue.length) {
				gConnections[x].featMLSD   = gFtp.featMLSD;                         // copy over feats b/c we add to the queue even b/f connecting
				gConnections[x].featMDTM   = gFtp.featMDTM;
				gConnections[x].featXMD5   = gFtp.featXMD5;
				gConnections[x].featXSHA1  = gFtp.featXSHA1;
				gConnections[x].featXCheck = gFtp.featXCheck;
				gConnections[x].featModeZ  = gFtp.featModeZ;

				gConnections[x].connect();                                          // turn on a connection
				return gConnections[x];
			}
		}

		var minConnection = gFtp;
		var minSize       = Number.MAX_VALUE;

		for (var x = 0; x < gConcurrent && x < gMaxCon; ++x) {                  // if all connections are busy add to the queue with the least bytes to be transferred
			if (gConnections[x].type == 'bad') {
				continue;
			}

			var size = 0;

			for (var y = 0; y < gConnections[x].eventQueue.length; ++y) {
				if (gConnections[x].eventQueue[y].cmd == "PASV" && parseInt(gConnections[x].eventQueue[y].callback2)) {
					size += gConnections[x].eventQueue[y].callback2;
				}
			}

			if (gConnections[x].dataSocket) {
				size += gConnections[x].dataSocket.progressEventSink.bytesTotal;
				size += gConnections[x].dataSocket.dataListener.bytesTotal;
			}

			if (size < minSize) {
				minConnection = gConnections[x];
				minSize       = size;
			}
		}

		return minConnection;
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

	recurseFolder: function(folder) {
		var parent = folder.parentPath;
		for (var i=0; i<folder.files.length; i++)
			new transfer().start(true, folder.files[i], parent);
		for (var i=0; i<folder.folders.length; i++)
			new transfer().start(true, folder.folders[i], parent);
	}

};
