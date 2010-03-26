#!/bin/bash
#
# A build script for packaging FireGSS as both a Firefox extension and a
# standalone application. Generated artifacts will be placed in the build
# directory. In order to properly verify the integrity of the xulrunner
# binaries, the public key must be imported first, like this:
# gpg --fetch-keys http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/1.9.1.7/KEY
#
NAME=firegss
XPI=$NAME.xpi
BUILD_DIR=build
XULRUNNER_URL=http://releases.mozilla.org/pub/mozilla.org/xulrunner/releases/1.9.2/runtimes
XULRUNNER_FILE_LIN=xulrunner-1.9.2.en-US.linux-i686.tar.bz2
XULRUNNER_FILE_MAC=xulrunner-1.9.2.en-US.mac-pkg.dmg
XULRUNNER_FILE_WIN=xulrunner-1.9.2.en-US.win32.zip

# Build extension.
mkdir -p $BUILD_DIR
rm $BUILD_DIR/$XPI >/dev/null 2>&1
cd src
zip -qDr ../$BUILD_DIR/$XPI .
cd ..

# Build application.
cd src
mv content/firegss.xul content/main.xul
zip -qDr ../app/chrome/content.jar content
mv content/main.xul content/firegss.xul
cp defaults/preferences/firegss.js ../app/defaults/preferences/
zip -qDr ../app/chrome/locale.jar locale
zip -qDr ../app/chrome/skin.jar skin
# Package FireGSS bits with XULRunner.
cd ../app
# Package for Linux.
rm -r xulrunner firegss firegss.exe >/dev/null 2>&1
if [ ! -f ../build/$XULRUNNER_FILE_LIN ]
then
    # Fetch xulrunner.
    curl $XULRUNNER_URL/$XULRUNNER_FILE_LIN -o ../build/$XULRUNNER_FILE_LIN
    curl $XULRUNNER_URL/$XULRUNNER_FILE_LIN.asc -o ../build/$XULRUNNER_FILE_LIN.asc
    gpg --verify ../build/$XULRUNNER_FILE_LIN.asc ../build/$XULRUNNER_FILE_LIN
fi
tar jxf ../build/$XULRUNNER_FILE_LIN
cp xulrunner/xulrunner-stub firegss
tar jcf ../$BUILD_DIR/$NAME-linux.tar.bz2 .
# Package for Windows.
rm -r xulrunner firegss firegss.exe >/dev/null 2>&1
if [ ! -f ../build/$XULRUNNER_FILE_WIN ]
then
    # Fetch xulrunner.
    curl $XULRUNNER_URL/$XULRUNNER_FILE_WIN -o ../build/$XULRUNNER_FILE_WIN
    curl $XULRUNNER_URL/$XULRUNNER_FILE_WIN.asc -o ../build/$XULRUNNER_FILE_WIN.asc
    gpg --verify ../build/$XULRUNNER_FILE_WIN.asc ../build/$XULRUNNER_FILE_WIN
fi
unzip -q ../build/$XULRUNNER_FILE_WIN
cp xulrunner/xulrunner-stub.exe firegss.exe
zip -qr ../$BUILD_DIR/$NAME-win.zip .
# Package for Mac.
rm -r xulrunner firegss firegss.exe >/dev/null 2>&1
if [ ! -f ../build/$XULRUNNER_FILE_MAC ]
then
    # Fetch xulrunner.
    curl $XULRUNNER_URL/$XULRUNNER_FILE_MAC -o ../build/$XULRUNNER_FILE_MAC
    curl $XULRUNNER_URL/$XULRUNNER_FILE_MAC.asc -o ../build/$XULRUNNER_FILE_MAC.asc
    gpg --verify ../build/$XULRUNNER_FILE_MAC.asc ../build/$XULRUNNER_FILE_MAC
fi
unzip -q ../build/$XULRUNNER_FILE_MAC
cp xulrunner/xulrunner-stub.exe firegss.exe
zip -qr ../$BUILD_DIR/$NAME-mac.zip .
cd ..

