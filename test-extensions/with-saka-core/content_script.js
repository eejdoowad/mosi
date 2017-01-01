/* eslint-disable */

import { CSNode, target } from "saka-msg";
import { connectionTypes } from "saka-msg";

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
//
//
const net = new CSNode();

const store = {
  links: () => document.querySelectorAll("a").length
};

const actions = {
  UPDATE_XY: (data) => {
    document.getElementById("x-input").value = data.x;
    document.getElementById("y-input").value = data.y;
  }
};

const connections = {
  bp: {
    type: connectionTypes.persistent,
    init: [["INIT_XY", net.self]]
  }
};

net.init(state, actions, connections);


//
// Sending updates
//
document.getElementById("x-up").addEventListener("click", async () => {
  await net.bp.issue("INCREMENT_X", {increment: 1});
});

document.getElementById("y-up").addEventListener("click", async () => {
  await net.bp.issue("INCREMENT_Y", {increment: 1});
});
