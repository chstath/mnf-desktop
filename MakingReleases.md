# Introduction #

Making a new release for mnf-desktop requires the generation of four different binary artifacts:

  * The Firefox plugin
  * The Windows installer bundle
  * The OS X installer bundle
  * The linux tarball

The process is not fully automated due to the need for various platform-specific tools, but is actually quite simple. Afterwards, the files must be uploaded to the project web site and the Firefox update site. The process details will be described in the following sections.


# Common #

The first part of the process is common to every final artifact. After finishing the code changes deemed necessary for this release, the version number must be updated prior to building the binaries. The version number appears in the following files:

  * [src/install.rdf](http://code.google.com/p/mnf-desktop/source/browse/src/install.rdf#8)
  * [app/application.ini](http://code.google.com/p/mnf-desktop/source/browse/app/application.ini#4) (You should also update the build id in this file)
  * [mac-installer/Info.plist](http://code.google.com/p/mnf-desktop/source/browse/mac-installer/Info.plist)
  * [win-installer/setup.aip](http://code.google.com/p/mnf-desktop/source/browse/win-installer/setup.aip)

The first three files should be edited directly, while the windows installer file will be produced from [Advanced Installer](http://www.advancedinstaller.com/).

The final step for the common phase is to run the build.sh script from either Linux or Mac. Its artifacts will be created in the build directory.


# Firefox plugin #

After running build.sh, the plugin will be found in the build/mynetworkfolders.xpi file. After some local testing that would verify its correctness, it should be renamed to mynetworkfolders-XXX.xpi (where XXX is the current version number) and uploaded to the [update site](http://home.mynetworkfolders.com) (folder wp-content/uploads). Then the updateinfo file should be uploaded and finally the update.rdf file. The latter will trigger the update sequence for any browser that requests it, so the other bits must be already in place.

The update site must be updated with the new version prior to uploading. This requires [modifying](https://developer.mozilla.org/en/Extension_Versioning,_Update_and_Compatibility) the [update/update.rdf](http://code.google.com/p/mnf-desktop/source/browse/update/update.rdf) file, signing it and then creating a new change log file named after the version, [update/updateinfoXXX.xhtml](http://code.google.com/p/mnf-desktop/source/browse/update/updateinfo0.18.xhtml).

After updating update.rdf, it must be signed using [McCoy](https://developer.mozilla.org/en/McCoy). The signing process modifies the file, so it should be checked into the repository _after_ the signing takes place.

A verification of the update process can be made using a (preferably) separate Firefox profile, which contains the previous FireGSS version.

Finally the link to xpi in http://home.mynetworkfolders.com should be updated.


# Linux bundle #

The Linux bundle is created by the build.sh script, in build/mynetworkfolders-linux.tar.bz2. This should be uploaded to the project site (the wordpress site), with a specific version number e.g mynetworkfolders-linux-0.17.tar.bz2.

# Windows bundle #

The Windows installer bundle is created around the build.sh-generated archive in build/firegss-win.zip. This file must be transferred to a Windows machine with an Advanced Installer installation and unzippped. The win-installer/setup.aip file is the installer configuration, necessary for creating the msi file. There are only two important elements in the configuration:

  * specify the location of the extracted firegss-win.zip contents (which is performed once)
  * update the product version number (and product code which is proposed by the tool)

The generated artifact will be called FireGSS.msi. This should be uploaded to the project site.


# Mac OS X bundle #

The OS X installer bundle can be generated from the previous one. After mounting the dmg, we drag the binary to the Desktop. We inspect its contents either through the Finder (Show Package Contents) or using the command line (ls ~/Desktop/FireGSS.app/). We copy the updated Info.plist and app/application.ini file in ~/Desktop/FireGSS.app/Contents/, replacing the old one and we also copy any changed files from the repository inside the package's ~/Desktop/FireGSS.app/Contents/Resources/ folder. The package is ready for testing.

If we need to use a newer version of Xulrunner then we have to update its files in the package. First we have to install the new Xulrunner on our system and then copy from /Library/Frameworks/XUL.framework/Versions/1.9/... to mnf-desktop.app/Contents/Frameworks/XUL.framework using rsync -rl to deal with symbolic links correctly. Then we should copy
Library/Frameworks/XUL.framework/Versions/1.9/xulrunner to our package MacOS folder and rename it to our executable 's name.

Afterwards we can use the Disk Utility to generate the dmg file. We select New Image and set FireGSS in both the Save As and Name fields. We may leave the other settings in their default values. The generated artifact will be called FireGSS.dmg. This should be uploaded to the project site.

All downloadble file should be uploaded to google code project page.