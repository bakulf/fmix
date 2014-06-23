/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

Cu.import("resource://gre/modules/Services.jsm");

const PACKAGE_NAME = "fmix";
const REASON_APP_SHUTDOWN = 2;
const URL_FMIX = "resource://" + PACKAGE_NAME + "/modules/FMix.jsm";

const DEBUG = false;
function debug(msg) {
  if (DEBUG) {
    dump("** FMix Bootstrap ** Debug: " + msg + "\n");
  }
}

function install(data, reason) {
  debug("Install");
}

function uninstall(data, reason) {
  dump("Uninstall");
}

function startup(data, reason) {
  debug("Startup");

  // Set up the resource substitution.
  let resource = Services.io.getProtocolHandler("resource")
                            .QueryInterface(Ci.nsIResProtocolHandler);

  let alias = Services.io.newFileURI(data.installPath);
  if (!data.installPath.isDirectory()) {
    alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
  }

  resource.setSubstitution(PACKAGE_NAME, alias);

  // Load our helper.
  Cu.import(URL_FMIX);

  // And on we go.
  FMix.startup();
}

function shutdown(data, reason) {
  dump("Shutdown");

  // No need to do anything if we're quitting.
  if (reason == REASON_APP_SHUTDOWN) {
    return;
  }

  // Shut down the helper first.
  FMix.shutdown();
  FMix = null;
  Cu.unload(URL_FMIX);

  // Undo the resource substitution.
  let resource = Services.io.getProtocolHandler("resource")
                            .QueryInterface(Ci.nsIResProtocolHandler);
  resource.setSubstitution(PACKAGE_NAME, null);
}
