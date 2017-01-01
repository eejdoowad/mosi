/* eslint-disable */

//
// Managed state
//
var x = 0;
var y = 0;
var activePorts = [];
var activeLinkCollector;

//
// Connection setup and message handling
//
function broadcast(type, value) {
  activePorts.forEach(function(port) {
    port.postMessage({
      type: type,
      value: value
    });
  });
}

var waitingOn;
var totalLinks;
var targetPort;
// broadcasts if no port specified
function getAllLinks(port) {
  waitingOn = 0;
  totalLinks = 0;
  targetPort = port;
  activePorts
    .filter(function(port) { return port.name === "content_script"; })
    .forEach(function(port) {
      waitingOn++;
      port.postMessage({
        type: "GET_FRAME_LINKS"
      });
    });
}

function sendContentScriptInitData(port) {
  port.postMessage({
    type: "UPDATE_ALL",
    value: {
      x: x,
      y: y
    }
  });
  getAllLinks();
}

function sendPopupInitData(port) {
  port.postMessage({
    type: "UPDATE_ALL",
    value: {
      x: x,
      y: y
    }
  });
  getAllLinks(port);
}

function sendExtensionPageInitData(port) {
  port.postMessage({
    type: "UPDATE_ALL",
    value: {
      x: x,
      y: y
    }
  });
  getAllLinks(port);
}

function contentScriptMessageListener(msg, port) {
  switch (msg.type) {
    case "SEND_FRAME_LINKS":
      waitingOn--;
      totalLinks += msg.value;
      if (waitingOn === 0) {
        if (targetPort == null) {
          broadcast("SEND_ALL_LINKS", totalLinks);
        }
        else {
          targetPort.postMessage({
            type: "SEND_ALL_LINKS",
            value: totalLinks
          });
        }
      }
      break;
    case "INCREMENT_X":
      broadcast("UPDATE_X", ++x);
      break;
    case "INCREMENT_Y":
      broadcast("UPDATE_Y", ++y);
      break;
    default:
      console.error("unknown message type");
      break;
  }
};

function popupMessageListener(msg, port) {
  switch (msg.type) {
    case "INCREMENT_X":
      broadcast("UPDATE_X", ++x);
      break;
    case "INCREMENT_Y":
      broadcast("UPDATE_Y", ++y);
      break;
    default:
      console.error("unknown message type");
      break;
  }
};

function extensionPageMessageListener(msg, port) {
  switch (msg.type) {
    case "INCREMENT_X":
      broadcast("UPDATE_X", ++x);
      break;
    case "INCREMENT_Y":
      broadcast("UPDATE_Y", ++y);
      break;
    default:
      console.error("unknown message type");
      break;
  }
};

function removePort(portToRemove) {
  // disconnectedPort.onDisconnect.removeListener(disconnectListener);
  activePorts = activePorts.filter(function(port) {
    return port !== portToRemove;
  });
}

function contentScriptDisconnectListener(disconnectedPort) {
  removePort(disconnectedPort);
  getAllLinks();
}

function popupDisconnectListener(disconnectedPort) {
  removePort(disconnectedPort);
}

function extensionPageDisconnectListener(disconnectedPort) {
  removePort(disconnectedPort);
}

chrome.runtime.onConnect.addListener(function(port) {
  switch(port.name) {
    case "content_script":
      activePorts.push(port);
      port.onDisconnect.addListener(contentScriptDisconnectListener)
      port.onMessage.addListener(contentScriptMessageListener);
      sendContentScriptInitData(port);
      break;
    case "popup":
      activePorts.push(port);
      port.onDisconnect.addListener(popupDisconnectListener)
      port.onMessage.addListener(popupMessageListener);
      sendPopupInitData(port);
      break;
    case "extension_page":
      activePorts.push(port);
      port.onDisconnect.addListener(extensionPageDisconnectListener)
      port.onMessage.addListener(extensionPageMessageListener);
      sendExtensionPageInitData(port);
      break;
    default:
      console.error("unknown connection name");
      break;
  }
});
