var gUserGroups = new Array();
var gFileOwner;

function comparePermissions(p1, p2){
  if (p1.user && p2.group){
    return -1;
  }

  if (p1.group && p2.user){
    return 1;
  }

  if (p1.user && p2.user){
   if (p1.user.toLowerCase() < p2.user.toLowerCase()){
     if (p1.user==gFileOwner || p2.user==gFileOwner){//Owner appears always on the top of the list
       return 1;
     }
     return -1;
   }


   if (p1.user.toLowerCase() > p2.user.toLowerCase()){
     return 1;
   }
  }

  if (p1.group && p2.group){
   if (p1.group.toLowerCase() < p2.group.toLowerCase()){
      return -1;
   }

    if (p1.group.toLowerCase() > p2.group.toLowerCase()){
     return 1;
    }
  }
}

function permissionsAreEqual(p1, p2){
  if (p1.length!= p2.length){
    return false;
  }

  for (var i=0; i<p1.length; i++){
    if (p1[i].modifyACL!=p2[i].modifyACL){
      return false;
    }

    if (p1[i].write!=p2[i].write){
      return false;
    }

    if (p1[i].read!=p2[i].read){
      return false;
    }

  }

  return true;
}

function setUserGroups(){
  var ug = arguments[0];
  gUserGroups.splice(0, gUserGroups.length);

  for (var i=0; i<ug.length; i++){
      gUserGroups.push(ug[i]);
  }
}

function searchForUsers(searchString, func){
    gss.searchForUsers(searchString, func);
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
      gFileOwner = file.owner;
      var date = new Date(file.modificationDate);
      date     = gMonths[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear() + ' ' + date.toLocaleTimeString();

      var recursiveFolderData = { type: "remote", nFolders: 0, nFiles: 0, nSize: 0 };

      if (file.isFolder && recursive) {
        remoteTree.getRecursiveFolderData(file, recursiveFolderData);
      }

      gss.getUserGroups(setUserGroups);

      var origWritable = file.isWritable();
      var hxOldPermissions = hex_sha1(file.permissions.sort(comparePermissions).toSource());

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
        var changes = {};

        var hxNewPermissions = hex_sha1(params.permissions.sort(comparePermissions).toSource());

        if (hxOldPermissions != hxNewPermissions){
            changes.permissions = params.permissions;
        }
        if (file.name!=params.leafName){
            changes.name = params.leafName;
        }
        if (file.readForAll!=params.isPublic){
            changes.readForAll = params.isPublic;
        }
        if (file.versioned!=params.isVersioned){
            changes.versioned = params.isVersioned;
        }
<<<<<<< local
        
=======

>>>>>>> other
        gss.update(file, changes);
        remoteTree.refresh(false, true);
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
