var gInitialPermissions;
var gStrbundle;
var gArgs;

function init() {
   try{
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
            var permuser = document.createElement("label");
            permuser.id = "permuser" + new String(p);
            permuser.textContent = perm.user || perm.group;
            document.getElementById("permuserlist").appendChild(permuser);

            var permread = document.createElement("checkbox");
            permread.id = "permread_" + new String(p);
            permread.setAttribute("checked", perm.read);
            document.getElementById("permreadlist").appendChild(permread);
            permread.addEventListener("CheckboxStateChange", permissionChanged, true);

            var permwrite = document.createElement("checkbox");
            permwrite.id = "permwrite_" + new String(p);
            permwrite.setAttribute("checked", perm.write);
            document.getElementById("permwritelist").appendChild(permwrite);
            permwrite.addEventListener("CheckboxStateChange", permissionChanged, true);

            var permacl = document.createElement("checkbox");
            permacl.id = "permacl_" + new String(p);
            permacl.setAttribute("checked", perm.modifyACL);
            document.getElementById("permacllist").appendChild(permacl);
            permacl.addEventListener("CheckboxStateChange", permissionChanged, true);

//            addEventListener("CheckboxStateChange",  permissionChanged, perm, true);
        }
        change();
//    gInitialPermissions = $('manual').value;
        //addEventListener("CheckboxStateChange", change, true);
        
  } else {
    $('permrow').collapsed = true;
  }


  if (gArgs.writable != 'disabled') {
    $('public').checked = gArgs.isPublic;
    $('versioned').checked = gArgs.isVersioned;
    $('public').disabled = gArgs.isDirectory;
    $('versioned').disabled = gArgs.isDirectory;
    $('userrow').collapsed = true;
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
   catch(e){
       alert(e.toSource());
   }

}

function isChecked(element){
    if (element==null){
        return 0;
    }

    return element.checked;
}

function change() {
//  $('manual').value = (4 * $('suid').checked       + 2 * $('guid').checked        + 1 * $('sticky').checked).toString()
//                    + (4 * $('readowner').checked  + 2 * $('writeowner').checked  + 1 * $('execowner').checked).toString()
//                    + (4 * $('readgroup').checked  + 2 * $('writegroup').checked  + 1 * $('execgroup').checked).toString()
//                    + (4 * $('readpublic').checked + 2 * $('writepublic').checked + 1 * $('execpublic').checked).toString();

  if ($('manual')!=null){
      $('manual').value = (4 * isChecked($('suid'))       + 2 * isChecked($('guid'))        + 1 * isChecked($('sticky'))).toString()
                        + (4 * isChecked($('readowner'))  + 2 * isChecked($('writeowner'))  + 1 * isChecked($('execowner'))).toString()
                        + (4 * isChecked($('readgroup'))  + 2 * isChecked($('writegroup'))  + 1 * isChecked($('execgroup'))).toString()
                        + (4 * isChecked($('readpublic')) + 2 * isChecked($('writepublic')) + 1 * isChecked($('execpublic'))).toString();
  }
}

function permissionChanged(){
    //alert("permissionChanged: " + this.id + " checked " + this.checked);
    function parseAttribute(attr){
//        alert(attr.slice(attr.indexOf("perm"), attr.length));
        return attr.slice(new String("perm").length, attr.length);
    }

    var permAttribute = parseAttribute(this.id.split("_")[0]);
    var permIndex = this.id.split("_")[1];
    //alert(permAttribute + " " + permIndex);
//    alert("gArgs.permissions[" + permIndex + "]" + "." + permAttribute + "=" + this.checked);
    eval("gArgs.permissions[" + permIndex + "]" + "." + permAttribute + "=" + this.checked);
}

function doOK() {
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

