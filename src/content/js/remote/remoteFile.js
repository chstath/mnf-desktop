var gUserGroups = new Array();
var gUserTags = new Array();
var gFileOwner;

function compareTags(t1, t2) {
   if (t1.toLowerCase() < t2.toLowerCase()) {
      return -1;
   }

    if (t1.toLowerCase() > t2.toLowerCase()) {
     return 1;
    }
}

function comparePermissions(p1, p2) {
  if (p1.user && p2.group) {
    return -1;
  }

  if (p1.group && p2.user) {
    return 1;
  }

  if (p1.user && p2.user) {
   if (p1.user.toLowerCase() < p2.user.toLowerCase()) {
     if (p1.user==gFileOwner || p2.user==gFileOwner) {//Owner appears always on the top of the list
       return 1;
     }
     return -1;
   }


   if (p1.user.toLowerCase() > p2.user.toLowerCase()) {
     return 1;
   }
  }

  if (p1.group && p2.group) {
   if (p1.group.toLowerCase() < p2.group.toLowerCase()) {
      return -1;
   }

    if (p1.group.toLowerCase() > p2.group.toLowerCase()) {
     return 1;
    }
  }
}

function setUserGroups(groups, args) {
    var len = groups.length;
  gUserGroups.splice(0, gUserGroups.length);

  for (var i=0; i<len; i++) {
      gUserGroups.push(groups[i]);
  }
  gss.getUserTags(setUserTags, args);
}

function setUserTags(tags, args) {
    var len = tags.length;
    gUserTags.splice(0, gUserTags.length);

    for (var i=0; i<len; i++) {
        gUserTags.push(tags[i]);
    }
    remoteFile.actuallyShowProperties(args);
}

var remoteFile = {
  remove : function (file, prompt, multiple) {
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

    gss.deleteResource(file.uri, function () {
        var dirRow = remoteDirTree.selection.currentIndex;
        //if the parent is expanded
        if (remoteDirTree.isContainerOpen(dirRow)) {
            //collapse
            remoteDirTree.toggleOpenState(dirRow);
            //and expand again to update the subtree
            remoteDirTree.toggleOpenState(dirRow);
        } else
            remoteTree.updateView();
    });
    return true;
  },
  
  moveToTrash : function (file, prompt, multiple) {
    if (prompt && multiple && multiple > 1) {
      // deleting multiple
      if (!window.confirm(gStrbundle.getFormattedString("confirmToTrash2", [multiple]))) {
        return false;
      }
    } else if (prompt && file.isFolder) {
      // deleting a directory
      if (!window.confirm(gStrbundle.getFormattedString("confirmToTrash3", [file.name]))) {
        return false;
      }
    } else if (prompt) {
      // deleting a file
      if (!window.confirm(gStrbundle.getFormattedString("confirmToTrash", [file.name]))) {
        return false;
      }
    }

    gss.moveToTrash(file.uri, function () {
        var dirRow = remoteDirTree.selection.currentIndex;
        //if the parent is expanded
        if (remoteDirTree.isContainerOpen(dirRow)) {
            //collapse
            remoteDirTree.toggleOpenState(dirRow);
            //and expand again to update the subtree
            remoteDirTree.toggleOpenState(dirRow);
        } else
            remoteTree.updateView();
        remoteTree.refresh(false,false);
    });
    return true;
  },

  restoreFromTrash : function (file, prompt, multiple) {
    if (prompt && multiple && multiple > 1) {
      // deleting multiple
      if (!window.confirm(gStrbundle.getFormattedString("confirmFromTrash2", [multiple]))) {
        return false;
      }
    } else if (prompt && file.isFolder) {
      // deleting a directory
      if (!window.confirm(gStrbundle.getFormattedString("confirmFromTrash3", [file.name]))) {
        return false;
      }
    } else if (prompt) {
      // deleting a file
      if (!window.confirm(gStrbundle.getFormattedString("confirmFromTrash", [file.name]))) {
        return false;
      }
    }

    gss.restoreFromTrash(file.uri, function () {
        var dirRow = remoteDirTree.selection.currentIndex;
        //if the parent is expanded
        //if (remoteDirTree.isContainerOpen(dirRow)) {
            //collapse
            remoteDirTree.toggleOpenState(dirRow);
            //and expand again to update the subtree
            remoteDirTree.toggleOpenState(dirRow);
        //}
        //else{
            remoteTree.refresh(false,false);
            remoteTree.updateView();
        //}
    } );
    return true;
  },

  showProperties : function (file, recursive) {
      gss.getUserGroups(setUserGroups, { file: file, recursive: recursive });
  },
  
  actuallyShowProperties: function (args) {
    var file = args.file;
    var recursive = args.recursive;
    try {
      gFileOwner = file.owner;
      var date = new Date(file.modificationDate);
      date = gMonths[date.getMonth()] + ' ' + date.getDate() + ' ' +
            date.getFullYear() + ' ' + date.toLocaleTimeString();

      var recursiveFolderData = { type: "remote", nFolders: 0, nFiles: 0, nSize: 0 };

      if (file.isFolder && recursive)
        remoteTree.getRecursiveFolderData(file, recursiveFolderData);

      var origWritable = file.isWritable();
      var hxOldPermissions = hex_sha1(file.permissions.sort(comparePermissions).toSource());
      var hxOldTags="";
      if (!file.isFolder)
          hxOldTags = hex_sha1(file.tags.sort(compareTags).toSource());

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
                     ugroups             : gUserGroups
                 };

      if (!file.isFolder){
          params.utags = gUserTags;
          params.tags = file.tags;
      }

      window.openDialog("chrome://firegss/content/remoteProperties.xul", "properties", "chrome,modal,dialog,resizable,centerscreen", params);

      if (params.returnVal){//"OK" is fired
        var changes = {};

        var hxNewPermissions = hex_sha1(params.permissions.sort(comparePermissions).toSource());
        if (!file.isFolder) {
            var hxNewTags = hex_sha1(params.tags.sort(compareTags).toSource());
            if (hxOldTags != hxNewTags)
                changes.tags = params.tags;
        }


        if (hxOldPermissions != hxNewPermissions)
            changes.permissions = params.permissions;
        if (file.name != params.leafName)
            changes.name = params.leafName;
        if (file.readForAll != params.isPublic)
            changes.readForAll = params.isPublic;
        if (file.versioned != params.isVersioned)
            changes.versioned = params.isVersioned;

        gss.update(file, changes, function () {
            if (changes.name)
                file.uri = file.uri.substring(0, file.uri.lastIndexOf('/') + 1) + encodeURI(changes.name);
            gss.fetchFile(file, function() {
                remoteTree.refresh(false, true);
            });
        });
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
