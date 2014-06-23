/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://fmix/modules/FMix.jsm");

const DEBUG = false;
function debug(msg) {
  if (DEBUG) {
    dump("** FMixUI ** Debug: " + msg + "\n");
  }
}

const FMixUI = {

  _box: null,

  load: function() {
    debug("onload");

    this._box = document.getElementById("box-main");

    FMix.registerForUpdates(this);
    this.updates();
  },

  unload: function() {
    debug("onunload");

    FMix.unregisterForUpdates(this);
  },

  updates: function() {
    debug("updates");

    while (this._box.firstChild) {
      this._box.removeChild(this._box.firstChild);
    }

    var tabs = FMix.getTabs();
    for (var i = 0; i < tabs.length; ++i) {
      this.createTab(tabs[i].window, tabs[i].tab, i);
    }
  },

  createTab: function(window, tab, index) {
    debug("createTab");

    var browser = window.gBrowser.getBrowserForTab(tab);
    var utils = browser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                                     .getInterface(Ci.nsIDOMWindowUtils);

    var groupBox = document.createElement('groupbox');
    groupBox.setAttribute('flex', '0');
    this._box.appendChild(groupBox);

    var labelTitle = document.createElement('caption');
    labelTitle.setAttribute('label', 'Tab: ' + (index + 1) + '- URL: ' + browser.currentURI.spec);
    groupBox.appendChild(labelTitle);

    var inputMute = document.createElement('checkbox');
    inputMute.setAttribute('label', 'Mute or not this tab');
    inputMute.setAttribute('checked', utils.audioMuted ? 'true' : 'false');
    groupBox.appendChild(inputMute);

    var boxVolume = document.createElement('box');
    this._box.appendChild(boxVolume);

    var labelVolume = document.createElement('label');
    labelVolume.setAttribute('value', 'Volume:');
    boxVolume.appendChild(labelVolume);

    var inputVolume = document.createElement('scale');
    inputVolume.setAttribute('flex', '1');
    inputVolume.setAttribute('min', '0');
    inputVolume.setAttribute('max', '100');
    inputVolume.setAttribute('label', 'Volume controller for this tab');
    inputVolume.setAttribute('value', utils.audioVolume * 100);
    boxVolume.appendChild(inputVolume);

    var self = this;
    inputVolume.addEventListener('change', function() {
      debug("Volume Changed: " + (inputVolume.value / 100.0));
      utils.audioVolume = inputVolume.value / 100.0;
    }, true);

    inputMute.addEventListener('click', function() {
      debug("Mute Clicked: " + inputMute.checked);
      utils.audioMuted = inputMute.checked;
    }, true);

    var spacer = document.createElement('spacer');
    spacer.setAttribute('flex', '1');
    this._box.appendChild(spacer);
  }
};
