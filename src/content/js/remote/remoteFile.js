var remoteFile = {
  remove : function(file, prompt, multiple) {
    if (prompt && multiple && multiple > 1) {                                           // deleting multiple
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete2", [multiple]) + '\n'
                        + gStrbundle.getString("localDeleteWarning"))) {
        return false;
      }
    } else if (prompt && file.isFolder) {                                          // deleting a directory
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete3", [file.leafName]) + '\n'
                        + gStrbundle.getString("localDeleteWarning"))) {
        return false;
      }
    } else if (prompt) {                                                                // deleting a file
      if (!window.confirm(gStrbundle.getFormattedString("confirmDelete", [file.leafName]) + '\n'
                        + gStrbundle.getString("localDeleteWarning"))) {
        return false;
      }
    }

    gss.deleteResource(file.uri);
    return true;
  }
}
