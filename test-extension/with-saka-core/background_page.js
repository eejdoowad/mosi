/* eslint-disable */

// make observable (and state representation) a plugin
// make 2nd argument to issue optional specify frame
import { BPNode, target } from "saka-msg";

let x = 0;
let y = 0;

const fetchers = (issue) => ({
  x: () => x,
  y: () => y
});

const actions = (issue) => ({
  INCREMENT_X: (increment = 1) => {
    x = x + increment;
    issue(target.cs)("UPDATE_XY", {x, y});
  },
  INCREMENT_Y: (increment = 1) => {
    y = y + increment;
    issue(target.cs)("UPDATE_XY", {x, y});
  },
  INIT_XY: (targ) => {
    issue(targ)("UPDATE_XY", {x, y});
  }
});

const net = new BPNode(fetchable, actions);
