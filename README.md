# This library is still in development and does not work yet

# Mosi

Mosi is a library designed to simplify messaging for Chrome extensions. It takes care of the low-level details needed to setup connections and send messages.

Mosi thinks of each endpoint at which a message can be sent or received a Node.

# A quick example

At each endpoint, declare the available actions and the endpoint's subscriptions.

## background_page.js

```javascript
import { init, net } from 'mosi/bp';

let count = 0;

const actions = (src) => ({
  INCREMENT: ({ increment = 1 }) => {
    count += increment;
    net('count').msg('COUNT', count);
  },
  COUNT: () => {
    net(src).msg('COUNT', count);
  }
});

init(actions);
```

## content_script.js

```javascript
import { init, net, con } from 'mosi/cs';

const actions = (src) => ({
  COUNT: ({ count }) => {
    document.getElementById('count').value = count;
  }
});

const subscriptions = ['count'];

const connections = {
  bp: {
    type: con.PERSISTENT,
    init: [{ type: 'COUNT' }]
  }
};

init(actions, subscriptions, connections);

/* create GUI */
const view = document.createElement('table');
view.setAttribute('style',
  `z-index: 99999;
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 200px;
  background-color: white;`);
view.innerHTML = `
  <tr style='white-space: nowrap;'>
    <td><button id='increment'>Increment</button></td>
    <td id='count' style='text-align: right; min-width: 120px;'></td>
  </tr>`;
document.body.appendChild(view);

/* Add Listener */
document.getElementById('increment').addEventListener('click', () => {
  net('bp').msg('INCREMENT');
});
```

# status

Nothing to see yet

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
