/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

const EXPORTED_SYMBOLS = ["FMix"];

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// Files included in this package.
const URL_FMIX = "chrome://fmix/content/fmix.xul";
const URL_STRINGBUNDLE = "chrome://fmix/locale/bootstrap.properties";

// Elements that are needed to find insertion points.
const ID_BROADCASTERSET_MAIN = "mainBroadcasterSet";
const ID_COMMANDSET_MAIN = "mainCommandSet";
const ID_KEYSET_MAIN = "mainKeyset";
const ID_MENUSEPARATOR_DEVTOOLS = "devToolsEndSeparator";
const ID_MENUSEPARATOR_DEVTOOLS_APP = "appmenu_devToolsEndSeparator";
const ID_TOOLBARBUTTON_DEVTOOLS = "developer-toolbar-other-tools";

// Elements that get inserted into the DOM.
const ID_BROADCASTER_FMIX = "devtoolsMenuBroadcaster_FMix";
const ID_COMMAND_FMIX = "Tools:FMix";
const ID_KEYSET_FMIX = "fmixKeyset";
const ID_KEY_FMIX = "key_fmix";
const ID_MENUITEM_FMIX = "menu_fmix";
const ID_MENUITEM_FMIX_APP = "menu_fmix_app";
const ID_MENUITEM_FMIX_TOOLBAR = "menu_fmix_toolbar";

const WINDOW_TYPE_BROWSER = "navigator:browser";
const WINDOW_TYPE_FMIX = "FMix:Window";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Services", 
  "resource://gre/modules/Services.jsm");

const DEBUG = true;
function debug(msg) {
  if (DEBUG) {
    dump("** FMix ** Debug: " + msg + "\n");
  }
}

function openNewMixer() {
  debug("openNewMixer");

  return Services.ww.openWindow(null, URL_FMIX, null, "chrome,resizable", null);
}

function raiseOrOpenNewMixer() {
  debug("raiseOrOpenNewMixer");

  let mixer = Services.wm.getMostRecentWindow(WINDOW_TYPE_FMIX);
  if (!mixer) {
    mixer = openNewMixer();
  }

  mixer.focus();

  return mixer;
}

const WindowListener = {
  loadIntoWindow: function(domWindow) {
    debug("loading into window");

    // Grab the strings we need.
    let strings = Services.strings.createBundle(URL_STRINGBUNDLE);

    let label = strings.GetStringFromName("menuLabel");
    let accessKey = strings.GetStringFromName("menuAccessKey");
    let shortcutKey = strings.GetStringFromName("menuShortcutKey");
    let modifiers = strings.GetStringFromName("menuModifiers");

    let doc = domWindow.document;

    // Create a <broadcaster> for miscellaneous state (e.g. label, disabled).
    let broadcaster = doc.createElementNS(NS_XUL, "broadcaster");
    broadcaster.setAttribute("id", ID_BROADCASTER_FMIX);
    broadcaster.setAttribute("label", label);

    doc.getElementById(ID_BROADCASTERSET_MAIN).appendChild(broadcaster);

    // Create a <command> to let us know when to bring up our window.
    let command = doc.createElementNS(NS_XUL, "command");
    command.setAttribute("id", ID_COMMAND_FMIX);
    command.setAttribute("observes", ID_BROADCASTER_FMIX);
    command.addEventListener("command", raiseOrOpenNewMixer);

    // nsXBLWindowKeyHandler requires an 'oncommand' attribute to exist before
    // it will allow the handler to run... Grr.
    command.setAttribute("oncommand", ";");

    doc.getElementById(ID_COMMANDSET_MAIN).appendChild(command);

    // Adding a <key> to an existing <keyset> does not work. Instead we have to
    // create a new <keyset> and insert that as well.
    let keyset = doc.createElementNS(NS_XUL, "keyset");
    keyset.setAttribute("id", ID_KEYSET_FMIX);

    let key = doc.createElementNS(NS_XUL, "key");
    key.setAttribute("id", ID_KEY_FMIX);
    key.setAttribute("key", shortcutKey);
    key.setAttribute("modifiers", modifiers);
    key.setAttribute("command", ID_COMMAND_FMIX);

    keyset.appendChild(key);
    doc.getElementById(ID_KEYSET_MAIN).parentNode.appendChild(keyset);

    // Now add the actual menu items. Currently there are three distinct menus
    // that contain all the web developer tools, so we have to modify them all.
    function createMenuItem(id) {
      let menuitem = doc.createElementNS(NS_XUL, "menuitem");
      menuitem.setAttribute("id", id);
      menuitem.setAttribute("key", ID_KEY_FMIX);
      menuitem.setAttribute("observes", ID_BROADCASTER_FMIX);
      menuitem.setAttribute("command", ID_COMMAND_FMIX);
      return menuitem;
    }

    // This is the Tools -> Web Developer menu.
    let menusep = doc.getElementById(ID_MENUSEPARATOR_DEVTOOLS);
    let menuitem = createMenuItem(ID_MENUITEM_FMIX);
    // This is the only menu that gets an 'accesskey' property.
    menuitem.setAttribute("accesskey", accessKey);
    menusep.parentNode.insertBefore(menuitem, menusep);

    // This is the App button's Web Developer menu.
    menusep = doc.getElementById(ID_MENUSEPARATOR_DEVTOOLS_APP);
    if (menusep) {
      menuitem = createMenuItem(ID_MENUITEM_FMIX_APP);
      menusep.parentNode.insertBefore(menuitem, menusep);
    }

    // This is the More Tools popup menu on the Web Developer toolbar.
    let toolbar = doc.getElementById(ID_TOOLBARBUTTON_DEVTOOLS);
    if (toolbar) {
      let node = toolbar.firstChild;
      if (node.nodeName == "menupopup") {
        node = node.firstChild;
        while (node && node.nodeName != "menuseparator") {
          node = node.nextSibling;
        }
        if (node) {
          menuitem = createMenuItem(ID_MENUITEM_FMIX_TOOLBAR);
          node.parentNode.insertBefore(menuitem, node);
        }
      }
    }

    // Event listeners for tab open/close
    var container = domWindow.gBrowser.tabContainer;
    container.addEventListener("TabOpen", this, false);
    container.addEventListener("TabClose", this, false);

    for (let i = 0; i < domWindow.gBrowser.tabContainer.childNodes.length; ++i) {
      FMix.tabOpened(domWindow, domWindow.gBrowser.tabContainer.childNodes[i]);
    }
  },

  unloadFromWindow: function(domWindow) {
    debug("unloading from window");

    // Remove everything we added above.
    let ids = [
      ID_MENUITEM_FMIX_TOOLBAR,
      ID_MENUITEM_FMIX_APP,
      ID_MENUITEM_FMIX,
      ID_KEY_FMIX,
      ID_KEYSET_FMIX,
      ID_COMMAND_FMIX,
      ID_BROADCASTER_FMIX
    ];

    let doc = domWindow.document;

    for each (let id in ids) {
      let node = doc.getElementById(id);
      if (node) {
        node.parentNode.removeChild(node);
      }
    }

    // Event listeners for tab open/close
    var container = domWindow.gBrowser.tabContainer;
    container.removeEventListener("TabOpen", this);
    container.removeEventListener("TabClose", this);

    for (let i = 0; i < domWindow.gBrowser.tabContainer.childNodes.length; ++i) {
      FMix.tabOpened(domWindow, domWindow.gBrowser.tabContainer.childNodes[i]);
    }

    FMix.windowClosed(domWindow);
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'TabOpen':
        FMix.tabOpened(event.target.ownerDocument.defaultView, event.target);
        break;

      case 'TabClose':
        FMix.tabClosed(event.target.ownerDocument.defaultView, event.target);
        break;
    }
  },

  onOpenWindow: function(window) {
    let domWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIDOMWindow);

    let loadIntoWindow = this.loadIntoWindow.bind(this);
    let listener = function() {
      domWindow.removeEventListener("load", listener, false);

      // This function gets called for all windows so only muck with the window
      // if it's the right type.
      let windowType =
        domWindow.document.documentElement.getAttribute("windowtype");
      if (windowType != WINDOW_TYPE_BROWSER) {
        return;
      }

      loadIntoWindow(domWindow);
    };

    domWindow.addEventListener("load", listener, false);
  },

  onCloseWindow: function(window) {
    let domWindow = window.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIDOMWindow);
    let windowType =
      domWindow.document.documentElement.getAttribute("windowtype");
    if (windowType != WINDOW_TYPE_BROWSER) {
      return;
    }

    this.unloadFromWindow(domWindow);
  },

  onWindowTitleChange: function(window, title) {
    // Nothing needs to be done here.
  }
};

const FMix = {
  _unregisterComponentFunctions: [],

  startup: function() {
    debug("startup");

    this._checkPreferences();

    // Enumerate all currently open browser windows and add menu items.
    let windows = Services.wm.getEnumerator(WINDOW_TYPE_BROWSER);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
      WindowListener.loadIntoWindow(domWindow);
    }

    // Register for notification of future window loads.
    Services.wm.addListener(WindowListener);

    // Register components.
    let registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);

    const componentsToRegister = [];

    for each (let component in componentsToRegister) {
      let { classID: classID,
            description: description,
            contractID: contractID } = component.prototype;
      let factory = XPCOMUtils._getFactory(component);

      registrar.registerFactory(classID, description, contractID, factory);

      this._unregisterComponentFunctions.push(function() {
        registrar.unregisterFactory(classID, factory);
      });
    }
  },

  shutdown: function() {
    debug("shutdown");

    // No longer need to know about new windows.
    Services.wm.removeListener(WindowListener);

    // Remove menu items from all existing windows.
    let windows = Services.wm.getEnumerator(WINDOW_TYPE_BROWSER);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
      WindowListener.unloadFromWindow(domWindow);
    }

    // Close all the browser windows that are currently open.
    windows = Services.wm.getEnumerator(WINDOW_TYPE_FMIX);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
      domWindow.close();
    }

    // Unregister components
    for each (let unregister in this._unregisterComponentFunctions) {
      unregister();
    }
    this._unregisterComponentFunctions = [];
  },

  _tabMap: [],

  getTabs: function() {
    return this._tabMap;
  },

  tabOpened: function(window, tab) {
    debug("tab opened");

    var browser = window.gBrowser.getBrowserForTab(tab);
    var obj = { window: window, tab: tab,
                tabURL: browser.currentURI.spec,
                tabTitle: browser.contentWindow.document.title };

    var self = this;
    var listener = {
      QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener",
                                              "nsISupportsWeakReference"]),

      onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        if (aFlag & Ci.nsIWebProgressListener.STATE_STOP) {
          var browser = window.gBrowser.getBrowserForTab(tab);

          if (obj.tabURL != browser.currentURI.spec ||
              obj.tabTitle != browser.contentWindow.document.title) {
            obj.tabURL = browser.currentURI.spec;
            obj.tabTitle = browser.contentWindow.document.title;
            self.notifyObservers();
          }
        }
      },

      onLocationChange: function(aProgress, aRequest, aURI) { },

      // For definitions of the remaining functions see related documentation
      onProgressChange: function(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) {},
      onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},
      onSecurityChange: function(aWebProgress, aRequest, aState) {}
    };

    var browser = window.gBrowser.getBrowserForTab(tab);
    browser.addProgressListener(listener);
    obj.listener = listener;

    this._tabMap.push(obj);

    this.notifyObservers();
  },

  tabClosed: function(window, tab) {
    debug("tab closed");

    for (var i = 0; i < this._tabMap.length; ++i) {
      if (this._tabMap[i].tab == tab &&
          this._tabMap[i].window == window) {
        this._removeListener(this._tabMap[i]);
        this._tabMap.splice(i, 1);
        break;
      }
    }

    this.notifyObservers();
  },

  windowClosed: function(window) {
    debug("window closed");

    for (var i = 0; i < this._tabMap.length; ++i) {
      if (this._tabMap[i].window == window) {
        this._removeListener(this._tabMap[i]);
        this._tabMap.splice(i, 1);
        --i;
      }
    }

    this.notifyObservers();
  },

  _removeListener: function(obj) {
    debug("Removing the listener");
    var browser = obj.window.gBrowser.getBrowserForTab(obj.tab);
    browser.removeProgressListener(obj.listener);
  },

  _checkPreferences: function() {
    debug('Check preferences');

    var prefSvc = Cc['@mozilla.org/preferences-service;1']
                    .getService(Ci.nsIPrefService);
    var preferences = prefSvc.getBranch('media.');

    // Enabling Audio Channel Service.
    var acs = false;
    try {
      acs = preferences.getBoolPref('useAudioChannelService');
    } catch(e) {}

    if (!acs) {
      preferences.setBoolPref('useAudioChannelService', true);
    }

    // Default audioChannel must be content or more.
    var audioChannel = 'normal';
    try {
      audioChannel = preferences.getCharPref('defaultAudioChannel');
    } catch(e) {}

    if (audioChannel == 'normal') {
      preferences.setCharPref('defaultAudioChannel', 'content');
    }
  },

  _registered: [],

  registerForUpdates: function(obj) {
    debug('Registered for updates');
    var pos = this._registered.indexOf(obj);
    if (pos == -1) {
      this._registered.push(obj);
    }
  },

  unregisterForUpdates: function(obj) {
    debug('Unregistered for updates');
    var pos = this._registered.indexOf(obj);
    if (pos != -1) {
      this._registered.splice(pos, 1);
    }
  },

  notifyObservers: function() {
    debug('Notify objservers');
    for (var i = 0; i < this._registered.length; ++i) {
      this._registered[i].updates();
    }
  }
};
