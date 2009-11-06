var gUserGroups = new Array();
var gPermissions = new Array();
var gNewGroups = new Array();

function getUserGroup(name){
    for (var i=0; i<gUserGroups.length; i++){
        if (gUserGroups[i].name == name){
            return gUserGroups[i];
        }
    }

    return false;
}

function isAvailableUserGroup(ug){
    for (var i=0; i<gPermissions.length; i++){
        if (gPermissions[i].group==ug.name){
            return false;
        }
    }

    return true;
}

function init(){
    var args = window.arguments[0];
    gPermissions = args.permissions;
    gUserGroups = args.userGroups;

    var j=0;
    for (var i=0; i<gUserGroups.length; i++){
        if (isAvailableUserGroup(gUserGroups[i])){
            var groupRow = document.createElement("row");
            var groupCheckBox = document.createElement("checkbox");
            groupRow.id = j;
            groupCheckBox.id = gUserGroups[i].name;
            groupCheckBox.setAttribute("label", gUserGroups[i].name);
            groupRow.appendChild(groupCheckBox);
            groupRow.addEventListener("CheckboxStateChange", addGroup, true);

            document.getElementById("grouprow").appendChild(groupRow);
            gNewGroups.push("");
            j++;
        }
    }
}

function addGroup(){
    var value;
    if (this.childNodes[0].checked){
        value = this.childNodes[0].id;
    }
    else{
        value = "";
    }
    
    gNewGroups.splice(this.id, 1, value);
}

function doAccept(){
    var returnValue = new Array();
    for (var i=0; i<gNewGroups.length; i++){
        if(gNewGroups[i].length>0){
            returnValue.push(getUserGroup(gNewGroups[i]));
        }
    }
    window.arguments[0].returnValue = returnValue;
    
    return true;
}