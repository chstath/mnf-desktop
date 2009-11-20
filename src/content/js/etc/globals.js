const Cc = Components.classes;
const Ci = Components.interfaces;

var extManager = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
var addon = extManager.getItemForID("firegss@ebs.gr"); 
var gVersion = addon? addon.version: '0.12';   // version of FireGSS we're using
var gConnections;               // array of all our ftp connections
var gHiddenMode = false;        // show hidden files if true
var gSlash;                     // holds '/' or '\\' depending on local system
var gPlatform;                  // holds what platform we're on
var gTransferTypes;             // holds 'Auto', 'Binary', 'ASCII'
var gLogQueue = "";             // buffers log data
var gAlertWindow;               // reference to the alertDialog
var gPrograms = new Array();    // programs in our open with list
var gLocalPathFocus;            // keep the correct value in the local  path
var gRemotePathFocus;           // keep the correct value in the remote path
var gMonths;                    // localized months
var gSiteManager;               // hold site manager data
var gWebHost;                   // url used in viewing things on the web
var gPrefix;                    // part of the ftp url to get rid of for viewing on the web, e.g. /www
var gAccount;                   // name of the account we're connecting to
var gFolder;                    // current folder
var gTreeSync;                  // whether or not we're trying to keep directories in sync
var gTreeSyncLocal;             // base local  tree sync dir
var gTreeSyncRemote;            // base remote tree sync dir
var gTreeSyncManager;           // the code that manages changes
var gStatusBarClear = true;     // whether the status bar is clear or not
var gProcessing = 0;            // are we doing some processing?
var gFxp;                       // an fxp connection
var gFxpFiles;                  // files to be transfered over fxp
var gTempEditFiles = [];        // files being edited in the tmp directory

var gSearchFound;               // search: did we find any results?
var gSearchRunning = false;     // search: is search running?
var gSearchCallbacks;           // search: local callbacks
var gSearchName;                // search: filename search query
var gSearchType;                // search: 0 = local or 1 = remote
var gSearchRecursive;           // search: recursive or not
var gSearchMatchCase;           // search: match case or not
var gSearchRegExp;              // search: regular expression or not
var gSearchDates;               // search: specify dates or not
var gSearchFrom;                // search: from date
var gSearchTo;                  // search: to date
var gSearchRemoteUpdate = false;// search: if we are updating the view

var gDefaultAccount;            // from prefs: select the opened account
var gBytesMode;                 // from prefs: show kilobytes or just bytes
var gDebugMode;                 // from prefs: show debug msgs in log or not
var gDisableDestructMode;       // from prefs: true if we want to disable the self-destruct timer in the overwrite dialog
var gDonated;                   // from prefs: donated or not
var gErrorMode;                 // from prefs: show error msgs or not
var gInterfaceMode;             // from prefs: show local view, remote view, or both
var gLoadUrl;                   // from prefs: ftp url to open onload
var gLogErrorMode;              // from prefs: show only errors in log or not
var gLogMode;                   // from prefs: show log window or not
var gLogQueueMode;              // from prefs: show log or queue
var gNoPromptMode;              // from prefs: true if we want to disable the overwrite dialog
var gPasswordMode;              // from prefs: save password or not
var gRefreshMode;               // from prefs: refresh on remote side if change is made or not
var gTempPasvMode;              // from prefs: use passive mode for temporary connections
var gConcurrent;                // from prefs: how many simultaneous connections to try to have
var gMaxCon;                    // from prefs: how many max simultaneous connections firegss handles
var gOpenMode;                  // from prefs: 0 = download file, 1 = open file

var gStrbundle;                 // $() references
var gConnectButton;
var gAccountField;
var gFolderField;
var gLocalPath;
var gLocalTree;
var gLocalDirTree;
var gLocalTreeChildren;
var gLocalDirTreeChildren;
var gRemotePath;
var gRemoteTree;
var gRemoteDirTree;
var gRemoteTreeChildren;
var gRemoteDirTreeChildren;
var gCmdlogDoc;
var gCmdlogBody;
var gQueueTree;
var gQueueTreeChildren;
var gStatusPercent;
var gStatusMeter;
var gUsernameMode;
// services
var gProfileDir;
var gAtomService;
var gLoginManager;
var gLoginInfo;
var gFormHistory;
var gIos;
var gPromptService;
var gPrefsService;
var gPrefs;
var gfiregssUtils;
var gSyncSchedule;
var gSyncFolder;
var gRemoteSyncFolder = ".sync";

