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
  _stringBundle: null,

  load: function() {
    debug("onload");

    this._box = document.getElementById("box-main");
    this._stringBundle = document.getElementById("stringbundle");

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

    // No tabs, we can close the window.
    if (tabs.length == 0) {
      window.close();
      return;
    }

    for (var i = 0; i < tabs.length; ++i) {
      this.createTab(tabs[i].window, tabs[i].tab,
                     tabs[i].tabURL, tabs[i].tabTitle,
                     tabs[i].active, i);
    }
  },

  createTab: function(window, tab, tabURL, tabTitle, active, index) {
    debug("createTab");

    var browser = window.gBrowser.getBrowserForTab(tab);
    var utils = browser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                                     .getInterface(Ci.nsIDOMWindowUtils);

    var separator = document.createElement('separator');
    separator.setAttribute('orient', 'horizontal');
    separator.setAttribute('class', 'groove');
    this._box.appendChild(separator);

    var groupBox = document.createElement('groupbox');
    groupBox.setAttribute('flex', '0');
    this._box.appendChild(groupBox);

    var labelTitle = document.createElement('caption');
    labelTitle.setAttribute('label',
      this._stringBundle.getFormattedString('tab-title', [(index + 1), tabTitle]));
    labelTitle.setAttribute('crop', 'end');
    groupBox.appendChild(labelTitle);

    var boxURL = document.createElement('box');
    this._box.appendChild(boxURL);

    var labelURL = document.createElement('label');
    labelURL.setAttribute('crop', 'end');
    labelURL.setAttribute('value', this._stringBundle.getString('url-label'));
    boxURL.appendChild(labelURL);

    var labelURLValue = document.createElement('label');
    labelURLValue.setAttribute('flex', '1');
    labelURLValue.setAttribute('value', tabURL);
    labelURLValue.setAttribute('crop', 'end');
    boxURL.appendChild(labelURLValue);

    var boxAudio = document.createElement('box');
    this._box.appendChild(boxAudio);

    var labelAudio = document.createElement('label');
    labelAudio.setAttribute('crop', 'end');
    labelAudio.setAttribute('value', this._stringBundle.getString('audio-label'));
    boxAudio.appendChild(labelAudio);

    var labelAudioValue = document.createElement('label');
    labelAudioValue.setAttribute('flex', '1');
    labelAudioValue.setAttribute('value', active ?
      this._stringBundle.getString('audio-active') :
      this._stringBundle.getString('audio-inactive'));
    labelAudioValue.setAttribute('class', active ? 'header' : '');
    labelAudioValue.setAttribute('crop', 'end');
    boxAudio.appendChild(labelAudioValue);

    var inputMute = document.createElement('checkbox');
    inputMute.setAttribute('label', this._stringBundle.getString('mute-label'));
    inputMute.setAttribute('crop', 'end');
    inputMute.setAttribute('checked', utils.audioMuted ?
      this._stringBundle.getString('audio-active') :
      this._stringBundle.getString('audio-inactive'));
    groupBox.appendChild(inputMute);

    var boxVolume = document.createElement('box');
    this._box.appendChild(boxVolume);

    var labelVolume = document.createElement('label');
    labelVolume.setAttribute('value', this._stringBundle.getString('volume-label'));
    labelVolume.setAttribute('crop', 'end');
    boxVolume.appendChild(labelVolume);

    var inputVolume = document.createElement('scale');
    inputVolume.setAttribute('flex', '1');
    inputVolume.setAttribute('min', '0');
    inputVolume.setAttribute('max', '100');
    inputVolume.setAttribute('label', this._stringBundle.getString('scale-label'));
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
  }
};
