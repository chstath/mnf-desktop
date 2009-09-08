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
    gss.deleteResource(file.uri, function () { remoteTree.updateView(); } );
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

      var origWritable = file.isWritable();

      var params = { path                : file.path,
                     leafName            : file.name,
                     fileSize            : file.size,
                     date                : date,
                     origPermissions     : gSlash == "/" ? "-" + remoteTree.convertPermissions(false, file.permissions) : 0,
                     permissions         : "",
                     writable            : file.isWritable(),
                     hidden              : false,
                     isDirectory         : file.isFolder,
                     multipleFiles       : false,
                     isLinuxType         : gSlash == "/",
                     isLocal             : true,
                     recursiveFolderData : file.isFolder && recursive ? recursiveFolderData : null,
                     returnVal           : false,
                     isSymlink           : false,
                     symlink             : "" };

      window.openDialog("chrome://firegss/content/properties.xul", "properties", "chrome,modal,dialog,resizable,centerscreen", params);

      if (!params.returnVal) {
        return false;
      }

      if (params.isLinuxType) {
        if (params.permissions) {
          if (gPlatform == 'mac') {
            var perm         = (file.isDirectory() ? "4" : "10") + params.permissions;
            file.permissions = parseInt(perm, 8);
          } else {
            file.permissions = parseInt(params.permissions, 8);
          }
          return true;
        }
      } else if (origWritable != params.writable) {
        if (params.writable) {
          file.permissions = file.permissions == 365 ? 511 : 438;
        } else {
          file.permissions = file.permissions == 511 ? 365 : 292;
        }

        return true;
      }
    } catch (ex) {
      debug(ex);
    }

    return false;
  }
}

