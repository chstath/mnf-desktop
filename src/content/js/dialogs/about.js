function init() {
    setTimeout(function () {
        var version = document.getElementsByClassName("version")[0];
        version.attributes["value"].nodeValue = gVersion;
    }, 0);
    sizeToContent();
}
