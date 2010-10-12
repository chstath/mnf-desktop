var gNewUsers = new Array();
var gUsers = new Array();

function setUsers(){    
    var u = arguments[0];
    gUsers.splice(0, gUsers.length);

    for (var i=0; i<u.length; i++){
        gUsers.push(u[i]);
    }

    cleanUpResults();

    listResults();
}

function getUser(name){
    for (var i=0; i<gUsers.length; i++){
        if (gUsers[i].username == name){
            return gUsers[i];
        }
    }

    return false;
}

function init(){
    $('message').setAttribute("collapsed", true);
    $('noResultsMessage').setAttribute("collapsed", true);
}

function doSearch(){
    if ($('userName').value==""){
        return;
    }
    var parent = window.opener.window.opener;
    if (parent.wrappedJSObject)
        parent.wrappedJSObject.gss.searchForUsers($('userName').value, setUsers);
    else
        parent.gss.searchForUsers($('userName').value, setUsers);
}

function listResults(){
    if (gUsers.length>0){
        $('message').setAttribute("collapsed", false);
        $('noResultsMessage').setAttribute("collapsed", true);

        for (var i=0; i<gUsers.length; i++){
            var userRow = document.createElement("row");
            var userCheckBox = document.createElement("checkbox");
            userRow.id = i;
            userCheckBox.id = gUsers[i].username;
            userCheckBox.setAttribute("label", gUsers[i].username);
            userRow.appendChild(userCheckBox);
            userRow.addEventListener("CheckboxStateChange", addUser, true);
            document.getElementById("searchResuls").appendChild(userRow);
            gNewUsers.push("");
        }
    }
    else{
        $('message').setAttribute("collapsed", true);
        $('noResultsMessage').setAttribute("collapsed", false);
    }
}

function cleanUpResults(){
    var results = document.getElementById("searchResuls").childNodes;
    for (var i=0; i<results.length; i++){
        document.getElementById("searchResuls").removeChild(results[i]);
    }

    gNewUsers.splice(0, gNewUsers.length);
}

function addUser(){
    var value;
    if (this.childNodes[0].checked){
        value = this.childNodes[0].id;
    }
    else{
        value = "";
    }

    gNewUsers.splice(this.id, 1, value);
}

function doAccept(){
    var returnValue = new Array();
    for (var i=0; i<gNewUsers.length; i++){
        if(gNewUsers[i].length>0){
            returnValue.push(getUser(gNewUsers[i]));
        }
    }

    window.arguments[0].returnValue = returnValue;
    return true;
}
