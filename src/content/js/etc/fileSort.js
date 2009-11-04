function directorySort(a, b) {
  if (a.sortPath < b.sortPath)
    return -1;
  if (a.sortPath > b.sortPath)
    return 1;
  return 0;
}

function directorySort2(a, b) {
  if (a.parent.path.toLowerCase() < b.parent.path.toLowerCase())
    return -1;
  if (a.parent.path.toLowerCase() > b.parent.path.toLowerCase())
    return 1;
  if (a.path.toLowerCase() < b.path.toLowerCase())
    return -1;
  if (a.path.toLowerCase() > b.path.toLowerCase())
    return 1;
  return 0;
}

function directorySort2Remote(a, b) {
  if (a.parent.location.toLowerCase() < b.parent.location.toLowerCase())
    return -1;
  if (a.parent.location.toLowerCase() > b.parent.location.toLowerCase())
    return 1;
  if (a.location.toLowerCase() < b.location.toLowerCase())
    return -1;
  if (a.location.toLowerCase() > b.location.toLowerCase())
    return 1;
  return 0;
}

function compareName(a, b) {
  if (!a.isDirectory() && b.isDirectory())
    return 1;
  if (a.isDirectory() && !b.isDirectory())
    return -1;
  if (a.leafName.toLowerCase() < b.leafName.toLowerCase())
    return -1;
  if (a.leafName.toLowerCase() > b.leafName.toLowerCase())
    return 1;
  return 0;
}

function compareNameRemote(a, b) {
  if (!a.isFolder && b.isFolder)
    return 1;
  if (a.isFolder && !b.isFolder)
    return -1;
  if (a.name.toLowerCase() < b.name.toLowerCase())
    return -1;
  if (a.name.toLowerCase() > b.name.toLowerCase())
    return 1;
  return 0;
    
}

function compareSize(a, b) {
  if (!a.isDirectory() && b.isDirectory())
    return 1;
  if (a.isDirectory() && !b.isDirectory())
    return -1;
  return a.fileSize - b.fileSize;
}

function compareSizeRemote(a, b) {
  if (!a.isFolder && b.isFolder)
    return 1;
  if (a.isFolder && !b.isFolder)
    return -1;
  return a.size - b.size;
}

function compareType(a, b) {
  if (!a.isDirectory() && b.isDirectory())
    return 1;
  if (a.isDirectory() && !b.isDirectory())
    return -1;
  if (localTree.getExtension(a.leafName.toLowerCase()) < localTree.getExtension(b.leafName.toLowerCase()))
    return -1;
  if (localTree.getExtension(a.leafName.toLowerCase()) > localTree.getExtension(b.leafName.toLowerCase()))
    return 1;
  return 0;
}

function compareTypeRemote(a, b) {
    
  if (!a.isFolder && b.isFolder)
    return 1;
  if (a.isFolder && !b.isFolder)
    return -1;

  if (!a.isFolder && !b.isFolder){
      if (a.content.toLowerCase() < b.content.toLowerCase())
        return -1;
      if (a.content.toLowerCase() > b.content.toLowerCase())
        return 1;
  }

  return 0;
}

function compareDate(a, b) {
  if (!a.isDirectory() && b.isDirectory())
    return 1;
  if (a.isDirectory() && !b.isDirectory())
    return -1;
  return a.lastModifiedTime - b.lastModifiedTime;
}

function compareDateRemote(a, b) {
  if (!a.isFolder && b.isFolder)
    return 1;
  if (a.isFolder && !b.isFolder)
    return -1;
  return a.modificationDate - b.modificationDate;
}

function compareLocalAttr(a, b) {
  if (!a.isDirectory() && b.isDirectory())
    return 1;
  if (a.isDirectory() && !b.isDirectory())
    return -1;
  if (localTree.convertPermissions(a.isHidden(), a.permissions) < localTree.convertPermissions(b.isHidden(), b.permissions))
    return -1;
  if (localTree.convertPermissions(a.isHidden(), a.permissions) > localTree.convertPermissions(b.isHidden(), b.permissions))
    return 1;
  return 0;
}

function compareRemoteAttr(a, b) {
  if (!a.isFolder && b.isFolder)
    return 1;
  if (a.isFolder && !b.isFolder)
    return -1;
  if (a.permissions < b.permissions)
    return -1;
  if (a.permissions > b.permissions)
    return 1;
  return 0;
}

function compareAccount(a, b) {
  if (a.account.toLowerCase() < b.account.toLowerCase())
    return -1;
  if (a.account.toLowerCase() > b.account.toLowerCase())
    return 1;
  return 0;
}
