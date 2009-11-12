var gInitialPermissions;
var gStrbundle;
var gArgs;
var gTags;

function init() {
  gStrbundle = $("strings");
  gArgs      = window.arguments[0];

  setTimeout("$('properties').getButton('accept').focus()", 0);

  if (gArgs.multipleFiles) {
    multipleFiles();
    return;
  }

  $('path').value = gArgs.path;
  $('name').value = gArgs.leafName;
  $('date').value = gArgs.date;
  $('uri').value = gArgs.uri;
  $('user').value = gArgs.user;

  if (gArgs.recursiveFolderData) {
    $('size').value = parseSize(gArgs.recursiveFolderData.nSize)
        + (gArgs.recursiveFolderData.nSize > 1023 ?
        "  (" + gStrbundle.getFormattedString("bytes", [commas(gArgs.recursiveFolderData.nSize)]) + ")" :
        "");
    $('contains').value = gStrbundle.getFormattedString("files", [commas(parseInt(gArgs.recursiveFolderData.nFiles))]) + ", "
                        + gStrbundle.getFormattedString("folders", [commas(parseInt(gArgs.recursiveFolderData.nFolders))]);

    if (gArgs.applyTo && gArgs.applyTo.type) {
      $('thisprop').checked = gArgs.applyTo.thisFile;
      $('foldersprop').checked = gArgs.applyTo.folders;
      $('filesprop').checked = gArgs.applyTo.files;
    } else {
      $('multipleprops').collapsed = true;
    }
  } else {
    $('size').value = parseSize(gArgs.fileSize) + (gArgs.fileSize > 1023 ? "  (" + gStrbundle.getFormattedString("bytes", [commas(gArgs.fileSize)]) + ")" : "");
    $('containsrow').collapsed = true;
    $('multipleprops').collapsed = true;
  }

  if (gArgs.isDirectory)
    $('sizerow').collapsed = true;

  if (gArgs.permissions) {
       for (var p=0; p<gArgs.permissions.length; p++){
            var perm = gArgs.permissions[p];
            addPermission({permission : perm});
       }
        change();
//    gInitialPermissions = $('manual').value;
        //addEventListener("CheckboxStateChange", change, true);
        
  } else {
    $('permrow').collapsed = true;
  }

  if (gArgs.tags){
    gTags = new Array();
    for (var i=0; i<gArgs.tags.length; i++){
        gTags[i] = gArgs.tags[i];

    }
    addTags(gTags);
    addAllTags(gArgs.utags);
  }
  else{
      $('alltagsrow').collapsed = true;
      $('tagsrow').collapsed = true;
  }

  if (gArgs.writable != 'disabled') {
    $('public').checked = gArgs.isPublic;
    $('versioned').checked = gArgs.isVersioned;
    $('public').disabled = gArgs.isDirectory;
    $('versioned').disabled = gArgs.isDirectory;
    $('userrow').collapsed = true;
    if (!$('public').disabled){
        $('public').addEventListener("CheckboxStateChange", isPublicChanged, true);
    }
    if (!$('versioned').disabled){
        $('versioned').addEventListener("CheckboxStateChange", isVersionedChanged, true);
    }
  } else {
    $('attrrow').collapsed = true;
    $('user').value = gArgs.user;
  }

  if (gArgs.isDirectory) {
    $('fileIcon').setAttribute("class", "isFolder");
  } else {
    $('fileIcon').src = "moz-icon://file:///" + gArgs.path + "?size=32";
  }

}

function isChecked(element){
    if (element==null){
        return 0;
    }

    return element.checked;
}

function change() {
  if ($('manual')!=null){
      $('manual').value = (4 * isChecked($('suid'))       + 2 * isChecked($('guid'))        + 1 * isChecked($('sticky'))).toString()
                        + (4 * isChecked($('readowner'))  + 2 * isChecked($('writeowner'))  + 1 * isChecked($('execowner'))).toString()
                        + (4 * isChecked($('readgroup'))  + 2 * isChecked($('writegroup'))  + 1 * isChecked($('execgroup'))).toString()
                        + (4 * isChecked($('readpublic')) + 2 * isChecked($('writepublic')) + 1 * isChecked($('execpublic'))).toString();
  }
}

function permissionReadChanged(){
    gArgs.permissions[this.parentNode.id].read = this.checked;
}

function permissionWriteChanged(){
    gArgs.permissions[this.parentNode.id].write = this.checked;
}

function permissionModifyACLChanged(){
    gArgs.permissions[this.parentNode.id].modifyACL = this.checked;
}

function isPublicChanged(){
    gArgs.isPublic = this.checked;
}

function isVersionedChanged(){
    gArgs.isVersioned = this.checked;
}

function doOK() {
    var i, tags;
//    if ("returnVal" in gArgs) {
//        gArgs.returnVal = true;
//    gArgs.writable  = !$('readonly').checked;
//    }
//
//  if (!gInitialPermissions) {
//    return true;
//}
//
//  if (gArgs.multipleFiles) {
//    gArgs.permissions       = $('manual').value;
//    gArgs.applyTo.folders   = $('foldersprop').checked;
//    gArgs.applyTo.files     = $('filesprop').checked;
//  } else if (gInitialPermissions != $('manual').value || $('foldersprop').checked || $('filesprop').checked) {
//    gArgs.permissions = $('manual').value;
//
//    if (gArgs.applyTo) {
//      gArgs.applyTo.thisFile = $('thisprop').checked;
//      gArgs.applyTo.folders  = $('foldersprop').checked;
//      gArgs.applyTo.files    = $('filesprop').checked;
//    }
//  }

    gArgs.leafName = $('name').value;
    tags = $('tags').value.split(",");
    tags.trim();
    gTags = [];
    for (i=0; i<tags.length; i++){
        if (tags[i] !== "")
            gTags.push(tags[i]);
    }
    gArgs.tags.splice(0, gArgs.tags.length);
    
    for (i=0; i<gTags.length; i++){
        gArgs.tags.push(gTags[i]);
    }

    gArgs.returnVal = true;
    return true;
}

function multipleFiles() {
  $('pathrow').collapsed = true;
  $('urirow').collapsed = true;
  $('daterow').collapsed = true;
  $('containsrow').collapsed = true;
  $('userrow').collapsed = true;
  $('attrrow').collapsed = true;
  $('thisprop').collapsed = true;

  if (gArgs.recursiveFolderData.type == "remote") {
    change();
    gInitialPermissions = $('manual').value;
    addEventListener("CheckboxStateChange", change, true);

    $('foldersprop').checked = gArgs.applyTo.folders;
    $('filesprop').checked = gArgs.applyTo.files;
  } else {
    $('permrow').collapsed = true;
  }

  $('fileIcon').setAttribute("class", "isMultiple");
  $('name').value = gStrbundle.getFormattedString("files", [commas(parseInt(gArgs.recursiveFolderData.nFiles))]) + ", "
                  + gStrbundle.getFormattedString("folders", [commas(parseInt(gArgs.recursiveFolderData.nFolders))]);
  $('size').value = parseSize(gArgs.recursiveFolderData.nSize)
                  + (gArgs.recursiveFolderData.nSize > 1023 ? "  (" + gStrbundle.getFormattedString("bytes", [commas(gArgs.recursiveFolderData.nSize)]) + ")": "");
}

function addPermission(perm){
    var p = document.getElementById("permissionsRow").childNodes.length-1;
    var permRow = document.createElement("row");
    var isNew = !perm.permission;
    var isOwnersPermissions;
    var permissionCarrierName;

    permRow.id = p;

    if (!isNew){
        permissionCarrierName = perm.permission.user || perm.permission.group;
        isOwnersPermissions = ((perm.permission.user || perm.permission.group)==gArgs.user);
    }
    else{
        isOwnersPermissions = false;
        if (perm.group){ //is Group
            permissionCarrierName = perm.group.name;
        }
        else{ //is User
            permissionCarrierName = perm.user.username;
        }
    }
  
    //Permission Carrier (User or Group)
    var permissionCarrier = document.createElement("label");
    permissionCarrier.textContent = permissionCarrierName;
    permissionCarrier.disabled = isOwnersPermissions;

    //Read
    var read = document.createElement("checkbox");
    if (!isNew){
        read.setAttribute("checked", perm.permission.read);
    }
    read.addEventListener("CheckboxStateChange", permissionReadChanged, true);
    read.disabled = isOwnersPermissions;

    //Write
    var write = document.createElement("checkbox");
    if (!isNew){
        write.setAttribute("checked", perm.permission.write);
    }
    write.addEventListener("CheckboxStateChange", permissionWriteChanged, true);
    write.disabled = isOwnersPermissions;

    //ModifyACL
    var modifyACL = document.createElement("checkbox");
    if (!isNew){
        modifyACL.setAttribute("checked", perm.permission.modifyACL);
    }
    modifyACL.addEventListener("CheckboxStateChange", permissionModifyACLChanged, true);
    modifyACL.disabled = isOwnersPermissions;

    permRow.appendChild(permissionCarrier);
    permRow.appendChild(read);
    permRow.appendChild(write);
    permRow.appendChild(modifyACL);

    
    if (!isOwnersPermissions){
        var deletePermissionCarrier = document.createElement("toolbarbutton");
        deletePermissionCarrier.setAttribute("id", "searchClosebutton");
        deletePermissionCarrier.addEventListener("click", removePermission, true);
        permRow.appendChild(deletePermissionCarrier);
    }

    document.getElementById("permissionsRow").appendChild(permRow);
    
    if (perm.group){
       gArgs.permissions.push({
           modifyACL : false,
               write : false,
                read : false,
               group : perm.group.name,
            groupUri : perm.group.uri
       });
    }
    else if (perm.user){
        gArgs.permissions.push({
           modifyACL : false,
               write : false,
                read : false,
                user : perm.user.username
        });
    }
}

function removePermission(){
    var id = this.parentNode.id;

    gArgs.permissions.splice(id, 1);

    var permissionRow = this.parentNode;
    for (var i=permissionRow.childNodes.length-1;; i--){
        permissionRow.removeChild(permissionRow.childNodes[i]);
        if(i==0){
            break;
        }
    }

    var next = permissionRow.nextSibling;
    while (next){
        next.id=id;
        id++;
        next = next.nextSibling;
    }
}

function addGroup(){
    var parameters = {
        userGroups  : gArgs.ugroups,
        permissions : gArgs.permissions,
        returnValue : false
    };

    window.openDialog("chrome://firegss/content/addGroupRemote.xul", "addGroupRemote", "chrome,modal,dialog,resizable,centerscreen", parameters);

    for (var i=0; i<parameters.returnValue.length; i++){
        addPermission({group:parameters.returnValue[i]});
    }

}

function addUser(){
    var parameters = {
        returnValue : false
    };
    window.openDialog("chrome://firegss/content/addUserRemote.xul", "addUserRemote", "chrome,modal,dialog,resizable,centerscreen", parameters);

    for (var i=0; i<parameters.returnValue.length; i++){
        addPermission({user:parameters.returnValue[i]});
    }
}

function addTags(tags){
    var tagsString = "";
    for (var i=0; i<tags.length; i++){
        tagsString += tags[i];
        if (i<tags.length-1){
            tagsString += ", ";
        }
    }

    $('tags').value = tagsString;
}

function addAllTags(tags){
    var allTags = document.getElementById("alltags");
    var tagsPlaceHolder;
    for (var i=0; i<tags.length; i++){
        if (i%10==0){
            tagsPlaceHolder = document.createElement("hbox");
            allTags.appendChild(tagsPlaceHolder);
        }
        var tag = document.createElement("label");
        tag.className = "text-link";
        tag.textContent = tags[i];
        tag.addEventListener("click", addTag, true);
        tagsPlaceHolder.appendChild(tag);
    }
}

Array.prototype.trim = function(){
  for (var i=0; i<this.length; i++){
    this[i] = this[i].trim();
  }
}

Array.prototype.pushUnique = function(element, caseSensitive){
   for (var i=0; i<this.length; i++){
      if (caseSensitive){
        if (element.toUpperCase()==this[i].toUpperCase()){
          return false;
        }
      }
      else{
        if (element==this[i]){
          return false;
        }
      }
   }

   this.push(element);
   return true;
}

function addTag(){
    var tagsTemp = $('tags').value.split(",");
    gTags.splice(0, gTags.length);
    for (var i=0; i<tagsTemp.length; i++){
        if (tagsTemp[i].trim()!=""){
            gTags.push(tagsTemp[i]);
        }
    }

    gTags.trim();
    gTags.pushUnique(this.textContent);

    addTags(gTags);
}
