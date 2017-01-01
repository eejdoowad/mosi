/* eslint-disable */

//
// Construct GUI
//
var html = `
  <tr style="white-space: nowrap;">
    <td><button id="x-up">X</button></td>
    <td id="x" style="text-align: right; min-width: 120px;"></td>
  </tr>
  <tr style="white-space: nowrap;">
    <td><button id="y-up">Y</button></td>
    <td id="y"  style="text-align: right; min-width: 120px;"></td>
  </tr>
  <tr style="white-space: nowrap;">
    <td>Tab Links</td>
    <td id="tablinks" style="text-align: right; min-width: 120px;">0</td>
  </tr>
  <tr style="white-space: nowrap;">
    <td>All Links</td>
    <td id="alllinks" style="text-align: right; min-width: 120px;">0</td>
  </tr>`;

var view = document.createElement("table");
view.setAttribute("style",
  `z-index: 99999;
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 200px;
  background-color: white;`);
view.innerHTML = html;
document.body.appendChild(view)

let tabLinks = document.querySelectorAll("a").length;
document.getElementById("tablinks").innerText = tabLinks;

//
// Receiving updates
//
var port = chrome.runtime.connect({name: "content_script"});

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
    case "GET_FRAME_LINKS":
      port.postMessage({
        type: "SEND_FRAME_LINKS",
        value: tabLinks
      })
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
