# Mosi

Mosi is a library that simplifies Chrome extensions messaging. No more setting up setting up connections, sending messages and attaching listeners. With Mosi, simply declare the actions available at each endpoint and the subscriptions of each endpoint, then you can trigger those actions from any other endpoint in your extension.

# Quick Example - A Counter Extension

This is the source code for an extension that displays a count on every tab. The count starts at 0 and can be incremented by pressing a button. All tabs share the same count so that when the count is incremented from one tab, the change is synchronized to all other tabs.

## background_page.js

```javascript
import { init, net } from 'mosi/bp';

let count = 0;

// declare actions available on background page
const actions = (src) => ({
  INCREMENT: (increment = 1) => {
    count += increment;
    net('count').msg('NEW_COUNT', count);
  },
  COUNT: () => {
    net(src).msg('NEW_COUNT', count);
  }
});

// Initialize Mosi
init(actions);
```

The background page stores the count value. It declares two actions that other nodes can trigger: INCREMENT and COUNT.

If INCREMENT is triggered, the count is incremented and a message is sent to every node that subscribes to 'count' with the updated count value.

If COUNT is triggered, it sends a message to the source node that issued COUNT with the current value of count.

## content_script.js

```javascript
import { init, net } from 'mosi/lib/cs';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="increment">Increment</button><input id="count" disabled/>';
document.body.appendChild(counter);

// Declare actions available on content script
const actions = (src) => ({
  NEW_COUNT: (count) => {
    document.getElementById('count').value = count;
  }
});

const subscriptions = ['count'];

init(actions, subscriptions);

// Get initial count
net('bp').msg('COUNT');

// Add Click listener to increment count
document.getElementById('increment').addEventListener('click', () => {
  net('bp').msg('INCREMENT');
});
```

# Current Network Assumptions

* All traffic passes through the background page
* No node except the background page can be a message intermediary.

# Resolving targets

* net('self') - Execute actions locally. No messages are sent.
* net('bp') - Targets the background page. Calling net('bp') from the background page is equivalent to calling net('self').
* net('some_subscription') - Targets all nodes that have declared the subscription, including the source node if it has declared the subscription. A single message is sent to the background page, which then sends the messages to all subscribed nodes.

# API

## net
`net: (target: string) => Messager`

The net function's only argument is the target. The target can a built-in target or a subscription group. The built in target groups are:

* self - the local node, use this to trigger a local action
* src - the node that
* cs - all content scripts
* bp - the background page
* popup - the popup
* ... why don't you suggest more built-in targets?

Subscription group membership is specified by each node on initialization.

The net function returns a Messager Object, which can be used to communicate with all nodes belonging to the specified target.

## Messager

The Messager is an object with the following structure:

```typescript
Messager: {
  msg: (action: string, argument: any) => void,
  get: (action: string, argument: any) => any[]
}
```

## msg

msg sends a message to the target group. The user supplies an action and an optional argument to send to the target group. The receiving nodes of the target group must contain handlers for the specified action. Under the hood, msg works by sending a single message to every node of the target group.

## get

get is like msg, except it returns a value. Specifically, it returns a Promise on the value returned by the specified action. Because a target comprises multiple nodes, the promise value is acually a list of values, one for each target node.

```javascript
const [count] = await net("bp").get("COUNT");
```

# Error Handling

Users are likely to make two classes of errors:
1. Issuing an action to a node with no handler for that type of action.


2. Issuing an action to a non-existant subscription group.

The first case is a real error, which the receiving node handles by logging to the console that no action handler exists for the given type. The second case may be an error, but there is no way to distinguish an erroneous subscription targer from a subscription target with no currently existing members. The result is no messages are sent and executions continues as if msg were never called.

# Behind the scenes

Mosi works by setting up a message listener that 

# actions

* msg and no return

No message is sent back.

* msg and return

The return value is sent back and handled by a local action with the same name as the sending action. If there is no local action with that name, this is an error.

* get and no return



* get and return



# Developer Commands

```json
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "watch": "npm run build -- --watch",
    "clean": "rimraf dist",
    "lint": "tslint --project tsconfig.json --force -t stylish",
    "lint:fix": "npm run lint -- --fix",
    "test": "echo \"Error: no test specified\" && exit 1",
    "deploy": "echo \"No deploy specified\""
  }
```
