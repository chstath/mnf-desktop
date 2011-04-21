function init() {
    setTimeout(function () {
        var version = document.getElementsByClassName("version")[0];
        version.attributes["value"].nodeValue = window.arguments[0];
    }, 0);
    sizeToContent();
}
