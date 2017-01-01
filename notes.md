Question: does a library exist for abstracting away network communication? Nodes can dynamically declare their presence and connections, and also the data they have, (programmer specifies how they obtain the data)

// support for multiple edge types (xmlhttp, chrome ext, websocket)

// Live consistency is NOT a focus

// Perhaps might also be a nice interface to locally asynchronous data (e.g. get active tab)

// think about messages from destination to source (follow path of functional dependencies): think about goal, not steps to accomplish it
// e.g. each frame needs to know global link hints before rendering

// every node will have an automatically generated, non-controllable ID, in addition it can specify a list of classes to which it belongs

// Unsolved question: node/network topology discoverability
// multiple classes of nodes with different knowledge of network

// Unsolved question: handling network concurrency/race conditions
// possible answer: 

// When deciding what path data should take through a network:
// minimize the maximum cost

// simple multiple client single server example

// Consider making all variables read-only
// Writing requires issueing actions
// that call reducers... redux style
// but then you can't offload processing to other nodes

// Each node must store every other node that subscribes to its data

// Every node must store a full map of the network to determine how to route data and to avoid redundant messages

// perhaps edge nodes only need to store parent node...

// maybe allow manual network configuration for simpler networks

// Might have to partially implement IP...

// every node has to have a routing table for events
// messages contain the full list of target nodes, as messages are forwarded each node looks at the targets, and forwards message to next hops (each of which receive some subset of the targets)

// Need to specify if edge is two-way or one-way
// Type of edge (chrome extenstion/xmlhttp/websocket/webrtc)
// Cost of edge (based on edge type, or based on initial connection time, or specified manually)

// Use redux state /////// ACTUALLY mind changed... enforce no state representation, make bindings to redux though, one fundamental rule: single source of truth

// Every node exports its "state class" and queries to this node are made against its state class, state class is automatically derived from state


// 3 common classes of communication:
// 1.
// 2.
// 3.


the state class id would be 'coordinate' in this example

state = {
  x: 1,
  y: 2
}

then

state_class = {
  _value: "state",
  x: {
    _value: "state.x"
  },
  y: {
    _value: "state.y"
  }
}

then remote nodes query like: mosi.node('target').get(mosi.class('coordinate').x)

This works and has the advantage of runtime checks for valid queries... but what if state is dynamic and doesn't always have the same form?... might have to stick to unsafe query string representation

...or might be able to manually use react syntax for declaring types and export those



IMPLEMENTATION STEPS
1. Point-to-Point. Two nodes, one edge, consistent state.
2. Chrome Extension: multiple content scripts, one background page, multiple extension pagess
3. Arbitrary network: this will require a virtual network model





// server
const node_id = 'server-node'
let x = 0
let y = 0
const state = {
  x: {
    get: () => x
    set: (new_x) => x = new_x
  },
  y: {
    get: () => y
    set: (new_y) => y = new_y
  },
  three: {
    get: () => 3
    // no set(): unwritable
  }
}
const subscriptions = {
  increment_y: (increment = 1) => {
    y = y + increment
  }
}
const connections = []
// declare node to network exposing state
mosi.create(node_id, state, connections, subscriptions)





// client
const node_id = 'client-node'
const state = {}
const subscriptions = {
  update: () => {
    const {x, y} = await state.node('server-node').get({x: 'x' y: 'y'})
    document.getElementById('x-input').value = x
    document.getElementById('y-input').value = y
  }
}
const connections = {
  server-node: mosi.CHROME_EXTENSION_BACKGROUND_PAGE
}
const state = mosi.create(node_id, state, connections, subscriptions)

document.getElementById('x-up').onclick = async () => {
  // OPTION 1
  const {x, y} = await state.node('server-node').get({x: 'x' y: 'y'})
  await state.node('server-node').set({x + 1, y})
  await state.issue('update');
}

document.getElementById('y-up').onclick = async () => {
  // OPTION 2
  await state.issue('increment_y', {increment: 1})
  await state.issue('update')
}



API

mosi.ussue(event: string, toSelf: boolean) : void
* event: the type of event issued
* toSelf: when false, if a node issues an event that it also subscribes to, it does NOT receive the event, otherwise it does
* issues the specified event, any node subscribed to the event will execute its event handler


