#!/bin/sh
#
# A simple build script for FireGSS
#
NAME=firegss
XPI=$NAME.xpi
BUILD_DIR=build

# Build extension.
mkdir -p $BUILD_DIR
rm $BUILD_DIR/$XPI >/dev/null 2>&1
cd src
cd ..

# Build application.
cd src
zip -qDr ../$BUILD_DIR/$XPI .
mv content/firegss.xul content/main.xul
zip -qDr ../app/chrome/content.jar content
mv content/main.xul content/firegss.xul
cp defaults/preferences/firegss.js ../app/defaults/preferences/
zip -qDr ../app/chrome/locale.jar locale
zip -qDr ../app/chrome/skin.jar skin
cd ..

