function init(){

}//init()

//------------------------------------------------------------------------------

function doAccept(){
    return true;
}//doAccept

//------------------------------------------------------------------------------

function showHelp(){
//            window.openDialog("chrome://firegss/content/help.xul", "help",
//            "chrome,modal,dialog,centerscreen");

    runInFirefox("http://code.google.com/p/firegss");
}
//------------------------------------------------------------------------------