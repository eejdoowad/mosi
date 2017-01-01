/* eslint-disable */

//
// GUI setup
//
document.getElementById("link").onclick = function() {
  chrome.tabs.create({
    url: chrome.extension.getURL("extension_page.html"),
    active: true
  });
};

//
// Receiving updates
//
var port = chrome.runtime.connect({name: "popup"});

port.onMessage.addListener(function(msg) {
  switch(msg.type) {
    case "UPDATE_X":
      document.getElementById("x").innerText = msg.value;
      break;
    case "UPDATE_Y":
      document.getElementById("y").innerText = msg.value;
      break;
    case "UPDATE_ALL":
      document.getElementById("x").innerText = msg.value.x;
      document.getElementById("y").innerText = msg.value.y;
      break;
    case "SEND_ALL_LINKS":
      document.getElementById("alllinks").innerText = msg.value;
      break;
    default:
      break;
  }
});

//
// Sending updates
//
document.getElementById("x-up").addEventListener("click", incrementX);
document.getElementById("y-up").addEventListener("click", incrementY);

function incrementX() {
  port.postMessage({type: "INCREMENT_X"});
}

function incrementY() {
  port.postMessage({type: "INCREMENT_Y"});
}