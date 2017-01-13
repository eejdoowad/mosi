This document details some of the design challenges faced when building Mosi and my reasoning for choosing a certain design.



# How do you uniquely identify a node? Options:
  1. Generate a uuid on each node
    * Pros
      * simple
      * nodes have id immediately available
    * Cons
      * generating uuid can be expensive (in both time and space)
  2. Identify each node by its port metadata (e.g. port, tabId, frameId, url)
    * Pros
      * no extra space required
    * Cons
      * nodes don't id immediately available
      * complicated
      * raw port itself can't be serialized
      * using serializable metadata subset doesn't always provide enough info to distinguish a node (how do you identify a devtool which has neither tabId nor frame Id)
  3. Have background page assign an increasing integer id to each node when it connects
    * Pros
      * simple
    * Cons
      * nodes don't id immediately available

I started with generating a uuid on each node, but didn't like the cost and figured I could get rid of ids all together. So I tried using port metadata, since it made the code smaller and removed the id variable any many checks associated with it. Then I realized having identifying data that is string serializable is essential for executing onConnect actions that send information back to the newly connected node. The net function expects a string, and I could in theory modify it to support a port object, but that would complicate its implementation. So I thought, "Geez... I'm back at step 1". And I realized just using an increasing integer 

# How do actions work? How do you pass the arguments of an action?

I devised actions as an organized way of organizing messaging code. The basic idea was given an action type and an action argument, do something and fetch the return value, if any. I originally sketched out the code below as my goal for what the background page of the synchronized counter extension would look like.

```javascript
let count = 0;
const actions = {
  INCREMENT_COUNT: (increment=1) => { count += increment; },
  COUNT: () => count
}
```

I liked this design. It felt right. On startup, a node would issue a COUNT action to the background page to get the starting value. Then, when the user clicked increment, the node would issue an INCREMENT_COUNT. But then how would the other nodes get the updated count. The COUNT endpoint is available.



# Within an action, how do you refer to the source node that triggered the action, in case you want to respond back to it?

1. Pass the id of the source node as part of the action argument. The user would have to account for this explicitly. 

```javascript
const actions = {
  COUNT = (src) => {
    msg(src, 'NEW_COUNT', count);
  }
}
```

```javascript
const actions = {
  COUNT = (src) => () => {
    msg(src, 'NEW_COUNT', count);
  }
}
```

```javascript
const actions = (src) => {
  COUNT = () => {
    msg(src, 'NEW_COUNT', count);
  }
}
```

2. Final answer

```javascript
const actions = {
  COUNT = (__, src) => {
    msg(src, 'NEW_COUNT', count);
  }
}
```

I want to avoid creating node

# At the core of Mosi is the API for messaging 

Why supply msg() and get() directly instead of net().msg() and net().get()

Initially, there was only one function for messaging. It looked like this:

```javascript
net('bp')('INCREMENT_COUNT', 3)
```

`net('bp')` returns a function that can be used to issue actions to the background page. At the time, it felt right to me to separate the logic for resolving the target nodes from the logic for issuing actions. This API only supported one off messages with no response.

But I wanted to make it easy to fetch values from a remote node. So API 2.0 came about.

```javascript
const bp = net('bp');
bp.msg('INCREMENT_COUNT', 3);
const [count] = await bp.get('COUNT');
```

The `msg` function works just like before, but `get` returns a promise that resolves with the value returned by the action.

When I first designed the API, I thought caching the resolved targets would help improve performance, but then I realized when you introduce asynchronous code, using the cached resolved targets is a bad idea, because certains nodes may disconnect or new qualifying targets may have been added. So I removed caching and simplified my API.

```javascript
msg('bp', 'INCREMENT_COUNT', 3);
const [count] = await get('bp', 'COUNT');
```

... async sucks, caching sucks

# Handling asynchrony

Made this a lot harder. One example is src. Another is supporting asynchronoulsy fetched data. compromising functional purity. promises. what is and isn't guaranteed.


# need error handling for sending message to disconnected port, especially for get, but also possibly for msg


# Messaging and endpoints


## msg('self', NADA)

Executes immediately on local node, no message sent

## get('self', NADA)

Executes immediately on local node, no messages sent

## msg('bp', NADA) (from content script to background page)

1. msg() called on cs
2. msg message sent to bp
3. bp message listener sees that it is the target
4. bp executes action locally, using src port id within any internal actions

## get('bp', NADA) (from content script to background page)

1. get() called on node x
2. get_req message sent to bp
3. bp message listener sees get request is from node x and it is target
4. executes nada action and sends message to node x with returned value
5. node x message listener sees get response and resolves return promise with value

## msg('node y', NADA)

1. msg() called on node x
2. msg message send to bp
3. bp message listener sees it isn't target, but knows how to resolve target
4. bp sends msg message with src id specified to target node y
5. node y listener receieves msg and executes locally, using passed src id context for internal actions

## get('node y', NADA)

1. get() called on node x
2. get message send to bp
3. bp message listener sees it isn't target, but knows how to resolve target
4. bp sends get message with src id specified to target node y
5. node y listener receieves get and executes locally, using passed src id context for internal actions
6. node y sends response value back with type get_resp to dest src id
7. bp sees 


Message types:
'msg'
* when originally sent by content script, message doesn't include src id
* If bp forwards message, passes calculated src id
* bp has src id 0
'get'
* src id generated by bp like with msg
'rsp'
* 
* 

# src

everytime an action is executed, you must pass the src context somehow

Within an action, src is:
* the node that originally sent the message that triggered the action
* 'self' when the local node when a call to get() or msg() is not called from within an action


# A call to msg() or get() with destination 'self' never sends a message and all calls within the resulting action to 'src' can be replaced with 'self'

#  

# Built-in action of bp

META: (node_details = 'self') => {
  
  id,
  tabId,
  frameId,
  otherMetaData of node
}

const [meta] = await get('bp', META)


# allow .unique subscription declaration specifier for performance optimization (errors if two nodes try to declare that subscription)


# 0 is reserved for referring to self
# 1 is reserved for referring to background node