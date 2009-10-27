var gUserGroups = new Array();

function setUserGroups(){
  var ug = arguments[0];
  gUserGroups.splice(0, gUserGroups.length);

  for (var i=0; i<ug.length; i++){
      gUserGroups.push(ug[i]);
  }
}

var remoteFile = {
  remove : function(file, prompt, multiple) {
    if (prompt && multiple && multiple > 1) {
      // deleting multiple
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete2", [multiple]))) {
        return false;
      }
    } else if (prompt && file.isFolder) {
      // deleting a directory
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete3", [file.name]))) {
        return false;
      }
    } else if (prompt) {
      // deleting a file
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete", [file.name]))) {
        return false;
      }
    }

	gProcessing++;
    gss.deleteResource(file.uri, function () {
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
                                 } );
	gProcessing--;
    return true;
  },
  
  showProperties : function(file, recursive) {
      
    try {
      var date = new Date(file.modificationDate);
      date     = gMonths[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear() + ' ' + date.toLocaleTimeString();

      var recursiveFolderData = { type: "remote", nFolders: 0, nFiles: 0, nSize: 0 };

      if (file.isFolder && recursive) {
        remoteTree.getRecursiveFolderData(file, recursiveFolderData);
      }

      gss.getUserGroups(setUserGroups);

      var origWritable = file.isWritable();

      var params = { path                : file.isFolder? file.parent.uri.substr(gss.rootFolder.uri.length): file.path,
                     leafName            : file.name,
                     fileSize            : file.size,
                     date                : date,
                     uri                 : file.uri,
                     user                : file.owner,
                     permissions         : file.permissions,
                     writable            : file.isWritable(),
                     isPublic            : file.readForAll,
                     isVersioned         : file.versioned,
                     isDirectory         : file.isFolder,
                     multipleFiles       : false,
                     isLinuxType         : gSlash == "/",
                     isLocal             : false,
                     recursiveFolderData : file.isFolder && recursive ? recursiveFolderData : null,
                     returnVal           : false,
                     ugroups             : gUserGroups};


      window.openDialog("chrome://firegss/content/remoteProperties.xul", "properties", "chrome,modal,dialog,resizable,centerscreen", params);

      if (params.returnVal){//"OK" is fired
        var changes = {
                 name : params.leafName,
          permissions : params.permissions,
           readForAll : params.isPublic,
            versioned : params.isVersioned
        };

        gss.update(file, changes);
        remoteTree.refresh();
      }

      if (!params.returnVal) {
        return false;
      }

      return true;
    } catch (ex) {
      debug(ex);
    }

    return false;
  }
}